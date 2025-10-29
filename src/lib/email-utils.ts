import { supabase } from './supabase';
import { emailRateLimiter, EmailRateLimiter } from './email-rate-limiter';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_fr: string;
  body_en: string;
  variables: string[];
}

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
  language?: 'fr' | 'en';
}

export interface EmailResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  userMessage?: string;
  suggestedAction?: string;
  helpUrl?: string;
  emailId?: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    console.log('Sending email to:', options.to);
    console.log('Subject:', options.subject);

    // Check rate limits before sending
    const rateLimitCheck = emailRateLimiter.canSendEmail(options.to);
    if (!rateLimitCheck.allowed) {
      const retryAfterFormatted = rateLimitCheck.retryAfter
        ? EmailRateLimiter.formatRetryAfter(rateLimitCheck.retryAfter)
        : 'plus tard';

      console.warn('[Email] Rate limit exceeded:', rateLimitCheck.reason);

      return {
        success: false,
        error: rateLimitCheck.reason || 'Rate limit exceeded',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        userMessage: `Limite d'envoi dépassée. Veuillez réessayer dans ${retryAfterFormatted}.`,
        suggestedAction: `Attendez ${retryAfterFormatted} avant de réessayer`,
      };
    }

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: options,
    });

    console.log('Edge function response:', { data, error });

    if (error) {
      console.error('Edge function invocation error:', error);
      console.error('Error message:', error.message);
      console.error('Error context:', error.context);

      let errorCode = 'INVOCATION_ERROR';
      let userMessage = error.message || 'Erreur lors de l\'appel du service email';
      let suggestedAction = '';
      let helpUrl = '';

      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          if (errorBody.errorCode) {
            errorCode = errorBody.errorCode;
            userMessage = errorBody.userMessage || userMessage;
            suggestedAction = errorBody.suggestedAction || '';
            helpUrl = errorBody.helpUrl || '';
          }
        } catch (e) {
          console.error('Failed to parse error body:', e);
        }
      }

      const errorResult: EmailResult = {
        success: false,
        error: error.message,
        errorCode,
        userMessage,
        suggestedAction,
        helpUrl,
      };

      try {
        await supabase.from('notifications').insert({
          recipient_email: options.to,
          type: 'email',
          template_name: options.templateId || 'custom',
          subject: options.subject,
          body: options.body,
          status: 'failed',
          error_message: userMessage,
        });
      } catch (insertError) {
        console.error('Failed to insert notification record:', insertError);
      }

      return errorResult;
    }

    if (data && data.success === false) {
      console.error('Edge function returned error:', data.error);
      console.error('Error code:', data.errorCode);
      console.error('Error details:', data.technicalDetails);

      const errorResult: EmailResult = {
        success: false,
        error: data.error,
        errorCode: data.errorCode,
        userMessage: data.userMessage || data.error,
        suggestedAction: data.suggestedAction,
        helpUrl: data.helpUrl,
      };

      try {
        await supabase.from('notifications').insert({
          recipient_email: options.to,
          type: 'email',
          template_name: options.templateId || 'custom',
          subject: options.subject,
          body: options.body,
          status: 'failed',
          error_message: data.userMessage || data.error,
        });
      } catch (insertError) {
        console.error('Failed to insert notification record:', insertError);
      }

      return errorResult;
    }

    if (!data || typeof data.success === 'undefined') {
      console.error('Unexpected response format:', data);
      const errorResult: EmailResult = {
        success: false,
        error: 'Invalid response from email service',
        userMessage: 'Le service email a retourné une réponse invalide',
      };

      try {
        await supabase.from('notifications').insert({
          recipient_email: options.to,
          type: 'email',
          template_name: options.templateId || 'custom',
          subject: options.subject,
          body: options.body,
          status: 'failed',
          error_message: 'Invalid response format',
        });
      } catch (insertError) {
        console.error('Failed to insert notification record:', insertError);
      }

      return errorResult;
    }

    // Record successful email send in rate limiter
    emailRateLimiter.recordEmailSent(options.to);

    try {
      await supabase.from('notifications').insert({
        recipient_email: options.to,
        type: 'email',
        template_name: options.templateId || 'custom',
        subject: options.subject,
        body: options.body,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (insertError) {
      console.error('Failed to insert notification record:', insertError);
    }

    return {
      success: true,
      emailId: data.id,
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    console.error('Error stack:', error.stack);

    const errorMessage = error.message || 'Unknown error occurred';

    try {
      await supabase.from('notifications').insert({
        recipient_email: options.to,
        type: 'email',
        template_name: options.templateId || 'custom',
        subject: options.subject,
        body: options.body,
        status: 'failed',
        error_message: errorMessage,
      });
    } catch (insertError) {
      console.error('Failed to insert notification record:', insertError);
    }

    return {
      success: false,
      error: errorMessage,
      userMessage: 'Une erreur inattendue s\'est produite',
    };
  }
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}

export async function sendWarrantyCreatedEmail(
  customerEmail: string,
  customerName: string,
  contractNumber: string,
  additionalData: Record<string, string> = {},
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'warranty_created')
      .eq('is_active', true)
      .or(`dealer_id.eq.${user.id},is_system.eq.true`)
      .order('dealer_id', { ascending: false, nullsFirst: false });

    if (templates && templates.length > 0) {
      const template = templates[0];

      const variables = {
        customer_name: customerName,
        contract_number: contractNumber,
        company_name: 'Location Pro-Remorque',
        ...additionalData,
      };

      const subject = replaceVariables(
        language === 'fr' ? template.subject_fr : template.subject_en,
        variables
      );

      const body = replaceVariables(
        language === 'fr' ? template.body_fr : template.body_en,
        variables
      );

      return sendEmail({
        to: customerEmail,
        subject,
        body,
        templateId: 'warranty_created',
        language,
      });
    }

    const subject = language === 'fr'
      ? `Confirmation de votre garantie #${contractNumber}`
      : `Your Warranty Confirmation #${contractNumber}`;

    const body = language === 'fr'
      ? `Bonjour ${customerName},

Nous confirmons la création de votre garantie prolongée.

Numéro de contrat: ${contractNumber}

Vous pouvez consulter les détails de votre garantie dans votre espace client.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe Pro-Remorque`
      : `Hello ${customerName},

We confirm the creation of your extended warranty.

Contract Number: ${contractNumber}

You can view your warranty details in your customer portal.

For any questions, please don't hesitate to contact us.

Best regards,
The Pro-Remorque Team`;

    return sendEmail({
      to: customerEmail,
      subject,
      body,
      templateId: 'warranty_created',
      language,
    });
  } catch (error) {
    console.error('Error fetching template, using default:', error);

    const subject = language === 'fr'
      ? `Confirmation de votre garantie #${contractNumber}`
      : `Your Warranty Confirmation #${contractNumber}`;

    const body = language === 'fr'
      ? `Bonjour ${customerName},

Nous confirmons la création de votre garantie prolongée.

Numéro de contrat: ${contractNumber}

Vous pouvez consulter les détails de votre garantie dans votre espace client.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe Pro-Remorque`
      : `Hello ${customerName},

We confirm the creation of your extended warranty.

Contract Number: ${contractNumber}

You can view your warranty details in your customer portal.

For any questions, please don't hesitate to contact us.

Best regards,
The Pro-Remorque Team`;

    return sendEmail({
      to: customerEmail,
      subject,
      body,
      templateId: 'warranty_created',
      language,
    });
  }
}

export async function sendClaimStatusEmail(
  customerEmail: string,
  customerName: string,
  claimNumber: string,
  status: string,
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  const statusText = {
    fr: {
      submitted: 'soumise',
      under_review: 'en révision',
      approved: 'approuvée',
      denied: 'refusée',
      completed: 'complétée',
    },
    en: {
      submitted: 'submitted',
      under_review: 'under review',
      approved: 'approved',
      denied: 'denied',
      completed: 'completed',
    },
  };

  const subject = language === 'fr'
    ? `Mise à jour de votre réclamation #${claimNumber}`
    : `Update on Your Claim #${claimNumber}`;

  const body = language === 'fr'
    ? `Bonjour ${customerName},

Votre réclamation #${claimNumber} a été ${statusText.fr[status as keyof typeof statusText.fr] || status}.

Vous pouvez consulter les détails dans votre espace client.

Cordialement,
L'équipe Pro-Remorque`
    : `Hello ${customerName},

Your claim #${claimNumber} has been ${statusText.en[status as keyof typeof statusText.en] || status}.

You can view the details in your customer portal.

Best regards,
The Pro-Remorque Team`;

  return sendEmail({
    to: customerEmail,
    subject,
    body,
    templateId: 'claim_status_update',
    language,
  });
}

export async function sendWarrantyExpirationReminder(
  customerEmail: string,
  customerName: string,
  contractNumber: string,
  daysRemaining: number,
  language: 'fr' | 'en' = 'fr'
): Promise<{ success: boolean; error?: string }> {
  const subject = language === 'fr'
    ? `Votre garantie expire dans ${daysRemaining} jours`
    : `Your Warranty Expires in ${daysRemaining} Days`;

  const body = language === 'fr'
    ? `Bonjour ${customerName},

Votre garantie #${contractNumber} expire dans ${daysRemaining} jours.

Nous vous recommandons de renouveler votre garantie pour continuer à bénéficier de notre protection.

Contactez-nous pour plus d'informations sur le renouvellement.

Cordialement,
L'équipe Pro-Remorque`
    : `Hello ${customerName},

Your warranty #${contractNumber} expires in ${daysRemaining} days.

We recommend renewing your warranty to continue benefiting from our protection.

Contact us for more information about renewal.

Best regards,
The Pro-Remorque Team`;

  return sendEmail({
    to: customerEmail,
    subject,
    body,
    templateId: 'warranty_expiration_reminder',
    language,
  });
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_type', 'email')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return [];
  }
}

export async function testEmail(email: string): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: 'Test Email - Pro-Remorque',
    body: 'Ceci est un email de test. Si vous recevez ce message, la configuration email fonctionne correctement!',
  });
}
