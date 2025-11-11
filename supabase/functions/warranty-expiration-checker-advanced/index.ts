import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-environment",
};

interface WarrantyWithCustomer {
  id: string;
  contract_number: string;
  end_date: string;
  status: string;
  organization_id: string;
  customers: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    language_preference: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔍 Starting warranty expiration check...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = {
      expired: { count: 0, warranties: [] as string[] },
      expiring_30_days: { count: 0, notifications: [] as any[] },
      expiring_15_days: { count: 0, notifications: [] as any[] },
      expiring_7_days: { count: 0, notifications: [] as any[] },
      expiring_1_day: { count: 0, notifications: [] as any[] },
      timestamp: new Date().toISOString(),
    };

    // ========================================================================
    // 1. UPDATE EXPIRED WARRANTIES
    // ========================================================================

    const { data: expiredWarranties, error: expiredError } = await supabase
      .from("warranties")
      .select("id, contract_number, end_date")
      .eq("status", "active")
      .lt("end_date", today.toISOString());

    if (expiredError) throw expiredError;

    if (expiredWarranties && expiredWarranties.length > 0) {
      const warrantyIds = expiredWarranties.map((w) => w.id);

      const { error: updateError } = await supabase
        .from("warranties")
        .update({ status: "expired" })
        .in("id", warrantyIds);

      if (updateError) throw updateError;

      results.expired.count = expiredWarranties.length;
      results.expired.warranties = expiredWarranties.map((w) => w.contract_number);

      console.log(`✅ Updated ${expiredWarranties.length} warranties to expired status`);
    }

    // ========================================================================
    // 2. PROCESS EXPIRING WARRANTIES (30, 15, 7, 1 days)
    // ========================================================================

    const expirationLevels = [
      { days: 30, key: "expiring_30_days" as const, template: "warranty_expiring_30_days" },
      { days: 15, key: "expiring_15_days" as const, template: "warranty_expiring_15_days" },
      { days: 7, key: "expiring_7_days" as const, template: "warranty_expiring_7_days" },
      { days: 1, key: "expiring_1_day" as const, template: "warranty_expiring_1_day" },
    ];

    for (const level of expirationLevels) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + level.days);

      // Get warranties expiring on this specific day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: warranties, error: warrantiesError } = await supabase
        .from("warranties")
        .select(
          `
          id,
          contract_number,
          end_date,
          status,
          organization_id,
          customers (
            id,
            email,
            first_name,
            last_name,
            phone,
            language_preference
          )
        `
        )
        .eq("status", "active")
        .gte("end_date", startOfDay.toISOString())
        .lte("end_date", endOfDay.toISOString());

      if (warrantiesError) {
        console.error(`Error fetching ${level.days}-day warranties:`, warrantiesError);
        continue;
      }

      if (warranties && warranties.length > 0) {
        console.log(`📧 Processing ${warranties.length} warranties expiring in ${level.days} days`);

        for (const warranty of warranties as WarrantyWithCustomer[]) {
          if (!warranty.customers) continue;

          const customer = warranty.customers;

          // Check notification preferences
          const { data: prefs } = await supabase
            .from("notification_preferences")
            .select(`warranty_expiring_${level.days}_days`)
            .eq("user_id", customer.id)
            .eq("organization_id", warranty.organization_id)
            .single();

          // Skip if user disabled this notification
          if (prefs && prefs[`warranty_expiring_${level.days}_days`] === false) {
            console.log(
              `⏭️  Skipping notification for ${customer.email} (disabled in preferences)`
            );
            continue;
          }

          // Prepare email content
          const subject =
            customer.language_preference === "en"
              ? `Warranty Expiring in ${level.days} Day${level.days > 1 ? "s" : ""}`
              : `Votre garantie expire dans ${level.days} jour${level.days > 1 ? "s" : ""}`;

          const urgency = level.days <= 7 ? "high" : "medium";

          // Queue email
          const { error: emailError } = await supabase.from("email_queue").insert({
            organization_id: warranty.organization_id,
            recipient_email: customer.email,
            recipient_name: `${customer.first_name} ${customer.last_name}`,
            subject,
            template_name: level.template,
            template_data: {
              contract_number: warranty.contract_number,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              days_until_expiry: level.days,
              end_date: new Date(warranty.end_date).toLocaleDateString("fr-CA"),
              language: customer.language_preference,
            },
            priority: urgency,
            status: "pending",
          });

          if (emailError) {
            console.error(`❌ Failed to queue email for ${customer.email}:`, emailError);
            continue;
          }

          // Create in-app notification
          const { error: notifError } = await supabase.from("notifications").insert({
            recipient_id: customer.id,
            type: "in_app",
            title: subject,
            body:
              customer.language_preference === "en"
                ? `Your warranty ${warranty.contract_number} expires in ${level.days} days. Renew now to maintain coverage.`
                : `Votre garantie ${warranty.contract_number} expire dans ${level.days} jours. Renouvelez maintenant pour maintenir votre couverture.`,
            priority: urgency,
            status: "pending",
            metadata: {
              warranty_id: warranty.id,
              contract_number: warranty.contract_number,
              days_until_expiry: level.days,
              action_url: `/warranties/${warranty.id}`,
            },
          });

          if (notifError) {
            console.error(`❌ Failed to create notification:`, notifError);
          }

          // Send SMS for 7-day and 1-day warnings (if enabled)
          if (level.days <= 7 && customer.phone) {
            const { data: smsPrefs } = await supabase
              .from("notification_preferences")
              .select("sms_enabled, sms_warranty_expiring")
              .eq("user_id", customer.id)
              .eq("organization_id", warranty.organization_id)
              .single();

            if (smsPrefs?.sms_enabled && smsPrefs?.sms_warranty_expiring) {
              const smsMessage =
                customer.language_preference === "en"
                  ? `URGENT: Your warranty ${warranty.contract_number} expires in ${level.days} day${level.days > 1 ? "s" : ""}. Renew now!`
                  : `URGENT: Votre garantie ${warranty.contract_number} expire dans ${level.days} jour${level.days > 1 ? "s" : ""}. Renouvelez maintenant!`;

              try {
                const smsResponse = await fetch(
                  `${supabaseUrl}/functions/v1/send-sms`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${supabaseKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      to: customer.phone,
                      message: smsMessage,
                    }),
                  }
                );

                if (!smsResponse.ok) {
                  console.error(`❌ SMS send failed for ${customer.phone}`);
                }
              } catch (smsError) {
                console.error("SMS error:", smsError);
              }
            }
          }

          results[level.key].notifications.push({
            contract_number: warranty.contract_number,
            customer_email: customer.email,
            days_until_expiry: level.days,
          });
        }

        results[level.key].count = warranties.length;
      }
    }

    // ========================================================================
    // 3. LOG EXECUTION
    // ========================================================================

    await supabase.from("automation_logs").insert({
      organization_id: null, // System-wide task
      level: "info",
      message: "Warranty expiration check completed",
      data: results,
    });

    console.log("✅ Warranty expiration check completed:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Error in warranty expiration checker:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
