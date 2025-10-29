import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    console.log('Testing email configuration...');

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "info@locationproremorque.ca";
    const FROM_NAME = Deno.env.get("FROM_NAME") || "Location Pro-Remorque";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    const checks = {
      resendApiKey: {
        configured: !!RESEND_API_KEY,
        value: RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 7)}...` : null,
      },
      fromEmail: {
        configured: !!FROM_EMAIL,
        value: FROM_EMAIL,
      },
      fromName: {
        configured: !!FROM_NAME,
        value: FROM_NAME,
      },
      supabaseUrl: {
        configured: !!SUPABASE_URL,
        value: SUPABASE_URL,
      },
    };

    const allConfigured = checks.resendApiKey.configured &&
                          checks.fromEmail.configured &&
                          checks.fromName.configured &&
                          checks.supabaseUrl.configured;

    // Test Resend API if key is configured
    let resendApiTest: any = { tested: false };
    if (RESEND_API_KEY) {
      try {
        console.log('Testing Resend API connection...');
        const testResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: ["test@resend.dev"],
            subject: "Configuration Test",
            html: "<p>This is a test email to verify Resend configuration.</p>",
          }),
        });

        resendApiTest = {
          tested: true,
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
        };

        if (!testResponse.ok) {
          const errorData = await testResponse.json();
          resendApiTest.error = errorData;
        } else {
          const successData = await testResponse.json();
          resendApiTest.emailId = successData.id;
        }
      } catch (testError: any) {
        resendApiTest = {
          tested: true,
          success: false,
          error: testError.message,
        };
      }
    }

    const response = {
      success: allConfigured,
      timestamp: new Date().toISOString(),
      environment: {
        checks,
        allConfigured,
      },
      resendApiTest,
      recommendations: [],
    };

    // Add recommendations
    if (!checks.resendApiKey.configured) {
      response.recommendations.push({
        level: "critical",
        message: "RESEND_API_KEY n'est pas configuré",
        action: "Allez dans Supabase Dashboard > Settings > Edge Functions > Secrets et ajoutez RESEND_API_KEY",
        helpUrl: "https://resend.com/docs/send-with-supabase-edge-functions",
      });
    }

    if (resendApiTest.tested && !resendApiTest.success) {
      if (resendApiTest.error?.message?.includes('not verified')) {
        response.recommendations.push({
          level: "critical",
          message: "Le domaine email n'est pas vérifié dans Resend",
          action: "Vérifiez votre domaine dans Resend Dashboard (https://resend.com/domains)",
          helpUrl: "https://resend.com/docs/dashboard/domains/introduction",
        });
      } else if (resendApiTest.error?.message?.includes('Invalid API key')) {
        response.recommendations.push({
          level: "critical",
          message: "La clé API Resend est invalide",
          action: "Générez une nouvelle clé sur https://resend.com/api-keys",
          helpUrl: "https://resend.com/docs/dashboard/api-keys/introduction",
        });
      } else {
        response.recommendations.push({
          level: "warning",
          message: "Le test de l'API Resend a échoué",
          action: "Vérifiez vos paramètres Resend et les logs pour plus de détails",
          error: resendApiTest.error,
        });
      }
    }

    if (resendApiTest.tested && resendApiTest.success) {
      response.recommendations.push({
        level: "success",
        message: "✅ Configuration email parfaitement fonctionnelle!",
        action: "Vous pouvez envoyer des invitations sans problème",
      });
    }

    return new Response(
      JSON.stringify(response, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error('Error testing email config:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});