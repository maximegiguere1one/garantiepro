import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.11.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: credentials } = await supabase
      .from("integration_credentials")
      .select("api_key")
      .eq("dealer_id", user.id)
      .eq("integration_type", "stripe")
      .eq("is_active", true)
      .single();

    if (!credentials || !credentials.api_key) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(credentials.api_key, {
      apiVersion: "2024-06-20",
    });

    const { payment_intent_id, amount, reason = "requested_by_customer" } = await req.json();

    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "Payment Intent ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const refundData: any = {
      payment_intent: payment_intent_id,
      reason,
    };

    if (amount) {
      refundData.amount = amount;
    }

    const startTime = Date.now();

    const refund = await stripe.refunds.create(refundData);

    const processingTime = Date.now() - startTime;

    await supabase
      .from("payments")
      .update({
        status: "refunded",
        refund_amount: refund.amount,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", payment_intent_id);

    await supabase.rpc("log_integration_event", {
      p_dealer_id: user.id,
      p_integration_type: "stripe",
      p_event_type: "create_refund",
      p_status: "success",
      p_request_data: { payment_intent_id, amount, reason },
      p_response_data: { refund_id: refund.id, status: refund.status, amount: refund.amount },
      p_processing_time_ms: processingTime,
    });

    return new Response(
      JSON.stringify({
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating refund:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
