import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Attachment {
  filename: string;
  content: string;
  content_type: string;
}

interface QueuedEmail {
  id: string;
  to_email: string;
  from_email: string;
  subject: string;
  html_body: string;
  attachments?: Attachment[];
  attempts: number;
  max_retries: number;
  priority: string;
  organization_id: string | null;
  metadata: any;
}

// Délais de retry progressifs (en millisecondes)
const RETRY_DELAYS = [
  60000,      // 1 minute
  300000,     // 5 minutes
  900000,     // 15 minutes
  3600000,    // 1 heure
  7200000,    // 2 heures
];

async function sendEmailViaResend(email: QueuedEmail): Promise<{
  success: boolean;
  error?: string;
  resendId?: string;
}> {
  if (!RESEND_API_KEY) {
    return {
      success: false,
      error: 'RESEND_API_KEY not configured'
    };
  }

  try {
    const emailPayload: any = {
      from: email.from_email,
      to: [email.to_email],
      subject: email.subject,
      html: email.html_body,
    };

    // Add attachments if present
    if (email.attachments && email.attachments.length > 0) {
      console.log(`[Resend] Adding ${email.attachments.length} attachment(s)`);
      emailPayload.attachments = email.attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        type: attachment.content_type,
      }));
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      resendId: responseData.id
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

async function processEmailQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  retried: number;
}> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const stats = {
    processed: 0,
    sent: 0,
    failed: 0,
    retried: 0,
  };

  try {
    // Récupérer les emails en attente (triés par priorité puis date)
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .in('status', ['queued', 'retry'])
      .lte('next_retry_at', new Date().toISOString())
      .order('priority', { ascending: false }) // urgent > high > normal > low
      .order('created_at', { ascending: true }) // FIFO pour même priorité
      .limit(50); // Traiter max 50 emails par invocation

    if (fetchError) {
      console.error('[ProcessQueue] Error fetching emails:', fetchError);
      throw fetchError;
    }

    if (!emails || emails.length === 0) {
      console.log('[ProcessQueue] No emails to process');
      return stats;
    }

    console.log(`[ProcessQueue] Processing ${emails.length} emails`);

    for (const email of emails as QueuedEmail[]) {
      stats.processed++;

      try {
        // Marquer comme "en cours d'envoi"
        await supabase
          .from('email_queue')
          .update({ status: 'sending' })
          .eq('id', email.id);

        // Envoyer l'email via Resend
        const result = await sendEmailViaResend(email);

        if (result.success) {
          // Succès - marquer comme envoyé
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: email.attempts + 1,
              metadata: {
                ...email.metadata,
                resend_id: result.resendId,
                sent_by_processor: true,
              }
            })
            .eq('id', email.id);

          stats.sent++;
          console.log(`[ProcessQueue] Email ${email.id} sent successfully (attempt ${email.attempts + 1})`);
        } else {
          // Échec - déterminer si retry ou échec permanent
          const newAttempts = email.attempts + 1;

          if (newAttempts >= email.max_retries) {
            // Échec permanent
            await supabase
              .from('email_queue')
              .update({
                status: 'failed',
                failed_at: new Date().toISOString(),
                attempts: newAttempts,
                error_message: result.error || 'Unknown error'
              })
              .eq('id', email.id);

            stats.failed++;
            console.error(`[ProcessQueue] Email ${email.id} failed permanently after ${newAttempts} attempts: ${result.error}`);
          } else {
            // Programmer un retry
            const delayIndex = Math.min(newAttempts - 1, RETRY_DELAYS.length - 1);
            const nextRetryDelay = RETRY_DELAYS[delayIndex];
            const nextRetryAt = new Date(Date.now() + nextRetryDelay);

            await supabase
              .from('email_queue')
              .update({
                status: 'retry',
                attempts: newAttempts,
                error_message: result.error || 'Unknown error',
                next_retry_at: nextRetryAt.toISOString()
              })
              .eq('id', email.id);

            stats.retried++;
            console.log(`[ProcessQueue] Email ${email.id} scheduled for retry at ${nextRetryAt.toISOString()} (attempt ${newAttempts}/${email.max_retries})`);
          }
        }
      } catch (emailError: any) {
        console.error(`[ProcessQueue] Error processing email ${email.id}:`, emailError);

        // En cas d'erreur système, programmer un retry
        const newAttempts = email.attempts + 1;
        if (newAttempts >= email.max_retries) {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              attempts: newAttempts,
              error_message: emailError.message
            })
            .eq('id', email.id);
          stats.failed++;
        } else {
          const delayIndex = Math.min(newAttempts - 1, RETRY_DELAYS.length - 1);
          const nextRetryDelay = RETRY_DELAYS[delayIndex];
          const nextRetryAt = new Date(Date.now() + nextRetryDelay);

          await supabase
            .from('email_queue')
            .update({
              status: 'retry',
              attempts: newAttempts,
              error_message: emailError.message,
              next_retry_at: nextRetryAt.toISOString()
            })
            .eq('id', email.id);
          stats.retried++;
        }
      }

      // Petit délai entre chaque email pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return stats;
  } catch (error: any) {
    console.error('[ProcessQueue] Fatal error:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[ProcessQueue] Starting email queue processor');
    const startTime = Date.now();

    const stats = await processEmailQueue();

    const executionTime = Date.now() - startTime;

    console.log('[ProcessQueue] Completed:', {
      ...stats,
      executionTime: `${executionTime}ms`
    });

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        executionTime
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error('[ProcessQueue] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});