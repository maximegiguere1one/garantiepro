import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-environment",
};

interface Warranty {
  id: string;
  contract_number: string;
  end_date: string;
  status: string;
  customer_id: string;
}

interface Customer {
  email: string;
  first_name: string;
  last_name: string;
  language_preference: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = (await import("npm:@supabase/supabase-js@2")).createClient(
      supabaseUrl,
      supabaseKey
    );

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const { data: expiredWarranties, error: expiredError } = await supabaseClient
      .from("warranties")
      .select("id, contract_number, end_date, status, customer_id")
      .eq("status", "active")
      .lt("end_date", today.toISOString())
      .limit(100);

    if (expiredError) throw expiredError;

    if (expiredWarranties && expiredWarranties.length > 0) {
      const warrantyIds = expiredWarranties.map((w: Warranty) => w.id);

      const { error: updateError } = await supabaseClient
        .from("warranties")
        .update({ status: "expired" })
        .in("id", warrantyIds);

      if (updateError) throw updateError;

      console.log(`Updated ${expiredWarranties.length} warranties to expired status`);
    }

    const { data: expiringWarranties, error: expiringError } = await supabaseClient
      .from("warranties")
      .select(`
        id,
        contract_number,
        end_date,
        customer_id,
        customers (
          email,
          first_name,
          last_name,
          language_preference
        )
      `)
      .eq("status", "active")
      .gte("end_date", today.toISOString())
      .lte("end_date", thirtyDaysFromNow.toISOString())
      .limit(100);

    if (expiringError) throw expiringError;

    const notificationsSent: any[] = [];

    if (expiringWarranties && expiringWarranties.length > 0) {
      for (const warranty of expiringWarranties) {
        const customer = warranty.customers as Customer;
        if (!customer) continue;

        const daysUntilExpiry = Math.ceil(
          (new Date(warranty.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const message = customer.language_preference === "en"
          ? `Your warranty ${warranty.contract_number} will expire in ${daysUntilExpiry} days. Contact us to renew.`
          : `Votre garantie ${warranty.contract_number} expire dans ${daysUntilExpiry} jours. Contactez-nous pour renouveler.`;

        const { error: notificationError } = await supabaseClient
          .from("notifications")
          .insert({
            recipient_id: warranty.customer_id,
            recipient_email: customer.email,
            type: "email",
            template_name: "warranty_expiration_reminder",
            subject: customer.language_preference === "en"
              ? "Warranty Expiration Reminder"
              : "Rappel d'expiration de garantie",
            body: message,
            status: "pending",
            metadata: {
              warranty_id: warranty.id,
              contract_number: warranty.contract_number,
              days_until_expiry: daysUntilExpiry,
            },
          });

        if (!notificationError) {
          notificationsSent.push({
            contract_number: warranty.contract_number,
            customer_email: customer.email,
            days_until_expiry: daysUntilExpiry,
          });
        }
      }
    }

    const result = {
      success: true,
      expired_count: expiredWarranties?.length || 0,
      expiring_soon_count: expiringWarranties?.length || 0,
      notifications_sent: notificationsSent.length,
      notifications: notificationsSent,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error in warranty expiration checker:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
