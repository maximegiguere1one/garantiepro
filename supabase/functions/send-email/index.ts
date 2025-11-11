import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "noreply@garantieproremorque.com";
const FROM_NAME = "Garantie Pro-Remorque";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-environment",
};

/**
 * Verify authentication - CRITICAL SECURITY
 */
async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('INVALID_TOKEN');
  }

  // Get user profile and verify role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  // Only admin and master can send emails
  if (!['admin', 'master', 'employee'].includes(profile.role)) {
    throw new Error('FORBIDDEN');
  }

  return { user, profile };
}

interface Attachment {
  filename: string;
  content: string; // Base64-encoded content
  content_type: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  html?: string;
  templateId?: string;
  variables?: Record<string, string>;
  attachments?: Attachment[];
  checkConfigOnly?: boolean;
}

interface ErrorResponse {
  success: false;
  errorCode: string;
  error: string;
  userMessage: string;
  technicalDetails?: any;
  helpUrl?: string;
  suggestedAction?: string;
}

function createErrorResponse(
  errorCode: string,
  error: string,
  userMessage: string,
  statusCode: number,
  technicalDetails?: any,
  suggestedAction?: string,
  helpUrl?: string
): Response {
  const response: ErrorResponse = {
    success: false,
    errorCode,
    error,
    userMessage,
    technicalDetails,
    suggestedAction,
    helpUrl,
  };

  return new Response(
    JSON.stringify(response),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // SECURITY: Verify authentication first
    await verifyAuth(req);

    console.log('Received email request');
    const { to, subject, body, html, variables, attachments, checkConfigOnly }: EmailRequest = await req.json();

    console.log('Request details:', { to, subject, hasBody: !!body, hasHtml: !!html, hasAttachments: !!attachments, attachmentsCount: attachments?.length || 0, checkConfigOnly });

    if (checkConfigOnly) {
      if (!RESEND_API_KEY) {
        return createErrorResponse(
          'CONFIG_MISSING',
          'RESEND_API_KEY not configured',
          'Le service email n\'est pas configuré. Veuillez configurer Resend dans les paramètres Supabase.',
          503,
          { missingSecret: 'RESEND_API_KEY' },
          'Allez dans Supabase Dashboard > Settings > Edge Functions > Secrets et ajoutez RESEND_API_KEY',
          'https://resend.com/docs/send-with-supabase-edge-functions'
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          configured: true,
          fromEmail: FROM_EMAIL,
          fromName: FROM_NAME,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!to || !subject || !body) {
      console.error('Missing required fields:', { to: !!to, subject: !!subject, body: !!body });
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Missing required fields',
        'Les champs requis sont manquants (destinataire, sujet ou corps du message).',
        400,
        { to: !!to, subject: !!subject, body: !!body },
        'Assurez-vous de fournir un destinataire, un sujet et un corps de message'
      );
    }

    if (!RESEND_API_KEY) {
      console.error('CRITICAL: RESEND_API_KEY not configured in Supabase secrets!');
      console.error('Please configure RESEND_API_KEY in Supabase Dashboard:');
      console.error('Project Settings > Edge Functions > Manage secrets');
      return createErrorResponse(
        'CONFIG_MISSING',
        'RESEND_API_KEY not configured',
        'Le service email n\'est pas configuré. Veuillez contacter l\'administrateur.',
        503,
        { missingSecret: 'RESEND_API_KEY' },
        'Allez dans Supabase Dashboard > Settings > Edge Functions > Secrets et ajoutez RESEND_API_KEY',
        'https://resend.com/docs/send-with-supabase-edge-functions'
      );
    }

    console.log('RESEND_API_KEY is configured (length:', RESEND_API_KEY.length, 'starts with:', RESEND_API_KEY.substring(0, 3), ')');
    console.log('FROM_EMAIL:', FROM_EMAIL);
    console.log('FROM_NAME:', FROM_NAME);

    let emailBody = body;
    if (variables && Object.keys(variables).length > 0) {
      Object.entries(variables).forEach(([key, value]) => {
        emailBody = emailBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
    }

    const emailData: any = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html: html || emailBody.replace(/\n/g, '<br>'),
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      console.log(`Adding ${attachments.length} attachment(s) to email`);
      emailData.attachments = attachments.map((attachment) => {
        console.log(`  - ${attachment.filename} (${attachment.content_type}, ${Math.round(attachment.content.length / 1024)}KB)`);
        return {
          filename: attachment.filename,
          content: attachment.content,
          type: attachment.content_type,
        };
      });
    }

    console.log('Sending email via Resend API...');
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    console.log('Resend API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error response:', JSON.stringify(errorData, null, 2));

      let errorCode = 'RESEND_ERROR';
      let userMessage = 'Une erreur est survenue lors de l\'envoi de l\'email.';
      let suggestedAction = '';
      let helpUrl = 'https://resend.com/docs/api-reference/errors';

      if (errorData.message) {
        if (errorData.message.includes('not verified')) {
          errorCode = 'DOMAIN_NOT_VERIFIED';
          userMessage = 'Le domaine email n\'est pas vérifié.';
          suggestedAction = 'Vérifiez votre domaine dans Resend Dashboard (https://resend.com/domains). Le statut doit être "Verified".';
          helpUrl = 'https://resend.com/docs/dashboard/domains/introduction';
        } else if (errorData.message.includes('Invalid API key') || errorData.message.includes('API key')) {
          errorCode = 'INVALID_API_KEY';
          userMessage = 'La clé API Resend est invalide.';
          suggestedAction = 'Générez une nouvelle clé sur https://resend.com/api-keys et mettez à jour RESEND_API_KEY dans Supabase.';
          helpUrl = 'https://resend.com/docs/dashboard/api-keys/introduction';
        } else if (errorData.message.includes('rate limit')) {
          errorCode = 'RATE_LIMIT_EXCEEDED';
          userMessage = 'Limite d\'envoi dépassée.';
          suggestedAction = 'Attendez quelques minutes ou passez à un plan supérieur sur Resend.';
          helpUrl = 'https://resend.com/docs/dashboard/usage/limits';
        }
      }

      return createErrorResponse(
        errorCode,
        errorData.message || errorData.error || `HTTP ${response.status}`,
        userMessage,
        response.status,
        errorData,
        suggestedAction,
        helpUrl
      );
    }

    const responseData = await response.json();
    console.log('Email sent successfully. Resend ID:', responseData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        id: responseData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.message === 'UNAUTHORIZED' || error.message === 'INVALID_TOKEN') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error.message === 'FORBIDDEN') {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Unexpected error in send-email function:', error);
    console.error('Error stack:', error.stack);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error.message || 'An unexpected error occurred',
      'Une erreur interne s\'est produite. Veuillez réessayer plus tard.',
      500,
      { errorType: error.name, stack: error.stack },
      'Si le problème persiste, contactez le support technique',
      'https://resend.com/support'
    );
  }
});