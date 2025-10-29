/**
 * Email Service
 *
 * Centralized service for handling all email operations with proper
 * separation of concerns, retry logic, and notification logging.
 *
 * Refactored from email-utils.ts to follow SOLID principles:
 * - Single Responsibility: Each method has one clear purpose
 * - Open/Closed: Easy to extend with new email types
 * - Dependency Inversion: Depends on abstractions (interfaces)
 */

import { supabase } from '../lib/supabase';
import { emailRateLimiter, EmailRateLimiter } from '../lib/email-rate-limiter';
import { createLogger } from '../lib/logger';
import { APP_CONFIG } from '../config/app-config';

const logger = createLogger('[EmailService]');

// Types
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

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_fr: string;
  body_en: string;
  variables: string[];
}

interface NotificationRecord {
  recipient_email: string;
  type: string;
  template_name: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: string;
}

/**
 * Email Service Class
 * Handles all email-related operations with proper error handling and logging
 */
export class EmailService {
  /**
   * Send an email with rate limiting and proper error handling
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    logger.info('Initiating email send', { to: options.to, subject: options.subject });

    // Check rate limits
    const rateLimitResult = this.checkRateLimit(options.to);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.error!;
    }

    try {
      // Invoke edge function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: options,
      });

      logger.debug('Edge function response received', { hasError: !!error, hasData: !!data });

      // Handle invocation errors
      if (error) {
        return await this.handleInvocationError(error, options);
      }

      // Handle edge function errors
      if (data && data.success === false) {
        return await this.handleEdgeFunctionError(data, options);
      }

      // Handle invalid response format
      if (!data || typeof data.success === 'undefined') {
        return await this.handleInvalidResponse(options);
      }

      // Success - record it
      emailRateLimiter.recordEmailSent(options.to);
      await this.logNotification(options, 'sent');

      logger.info('Email sent successfully', { emailId: data.id });

      return {
        success: true,
        emailId: data.id,
      };
    } catch (error: any) {
      return await this.handleUnexpectedError(error, options);
    }
  }

  /**
   * Check if email can be sent based on rate limits
   */
  private checkRateLimit(email: string): { allowed: boolean; error?: EmailResult } {
    const rateLimitCheck = emailRateLimiter.canSendEmail(email);

    if (!rateLimitCheck.allowed) {
      const retryAfterFormatted = rateLimitCheck.retryAfter
        ? EmailRateLimiter.formatRetryAfter(rateLimitCheck.retryAfter)
        : 'plus tard';

      logger.warn('Rate limit exceeded', { email, reason: rateLimitCheck.reason });

      return {
        allowed: false,
        error: {
          success: false,
          error: rateLimitCheck.reason || 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          userMessage: `Limite d'envoi dépassée. Veuillez réessayer dans ${retryAfterFormatted}.`,
          suggestedAction: `Attendez ${retryAfterFormatted} avant de réessayer`,
        },
      };
    }

    return { allowed: true };
  }

  /**
   * Handle edge function invocation errors
   */
  private async handleInvocationError(error: any, options: EmailOptions): Promise<EmailResult> {
    logger.error('Edge function invocation error', error, {
      message: error.message,
      context: error.context,
    });

    let errorCode = 'INVOCATION_ERROR';
    let userMessage = error.message || "Erreur lors de l'appel du service email";
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
      } catch (parseError) {
        logger.error('Failed to parse error body', parseError);
      }
    }

    await this.logNotification(options, 'failed', userMessage);

    return {
      success: false,
      error: error.message,
      errorCode,
      userMessage,
      suggestedAction,
      helpUrl,
    };
  }

  /**
   * Handle errors returned by edge function
   */
  private async handleEdgeFunctionError(data: any, options: EmailOptions): Promise<EmailResult> {
    logger.error('Edge function returned error', undefined, {
      error: data.error,
      errorCode: data.errorCode,
      technicalDetails: data.technicalDetails,
    });

    await this.logNotification(options, 'failed', data.userMessage || data.error);

    return {
      success: false,
      error: data.error,
      errorCode: data.errorCode,
      userMessage: data.userMessage || data.error,
      suggestedAction: data.suggestedAction,
      helpUrl: data.helpUrl,
    };
  }

  /**
   * Handle invalid response format
   */
  private async handleInvalidResponse(options: EmailOptions): Promise<EmailResult> {
    logger.error('Invalid response from email service');

    await this.logNotification(options, 'failed', 'Invalid response format');

    return {
      success: false,
      error: 'Invalid response from email service',
      userMessage: 'Le service email a retourné une réponse invalide',
    };
  }

  /**
   * Handle unexpected errors
   */
  private async handleUnexpectedError(error: any, options: EmailOptions): Promise<EmailResult> {
    const errorMessage = error.message || 'Unknown error occurred';
    logger.error('Unexpected error sending email', error);

    await this.logNotification(options, 'failed', errorMessage);

    return {
      success: false,
      error: errorMessage,
      userMessage: "Une erreur inattendue s'est produite",
    };
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    options: EmailOptions,
    status: 'sent' | 'failed' | 'pending',
    errorMessage?: string
  ): Promise<void> {
    try {
      const record: NotificationRecord = {
        recipient_email: options.to,
        type: 'email',
        template_name: options.templateId || 'custom',
        subject: options.subject,
        body: options.body,
        status,
        ...(errorMessage && { error_message: errorMessage }),
        ...(status === 'sent' && { sent_at: new Date().toISOString() }),
      };

      await supabase.from('notifications').insert(record);
      logger.debug('Notification logged', { status });
    } catch (error) {
      logger.error('Failed to log notification', error as Error);
      // Don't throw - logging failure shouldn't prevent email operation from completing
    }
  }

  /**
   * Replace variables in template text
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  /**
   * Send warranty created email
   */
  async sendWarrantyCreatedEmail(
    customerEmail: string,
    customerName: string,
    contractNumber: string,
    additionalData: Record<string, string> = {},
    language: 'fr' | 'en' = 'fr'
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Sending warranty created email', { customerEmail, contractNumber });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to load custom template
      const { data: templates } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', 'warranty_created')
        .eq('is_active', true)
        .or(`dealer_id.eq.${user.id},is_system.eq.true`)
        .order('dealer_id', { ascending: false, nullsFirst: false });

      let subject: string;
      let body: string;

      if (templates && templates.length > 0) {
        const template = templates[0];
        const variables = {
          customer_name: customerName,
          contract_number: contractNumber,
          company_name: APP_CONFIG.company.name,
          ...additionalData,
        };

        subject = this.replaceVariables(
          language === 'fr' ? template.subject_fr : template.subject_en,
          variables
        );

        body = this.replaceVariables(
          language === 'fr' ? template.body_fr : template.body_en,
          variables
        );
      } else {
        // Use default template
        const defaultTemplate = this.getDefaultWarrantyTemplate(
          customerName,
          contractNumber,
          language
        );
        subject = defaultTemplate.subject;
        body = defaultTemplate.body;
      }

      return await this.sendEmail({
        to: customerEmail,
        subject,
        body,
        templateId: 'warranty_created',
        language,
      });
    } catch (error) {
      logger.error('Error sending warranty created email', error as Error);

      // Fallback to default template
      const defaultTemplate = this.getDefaultWarrantyTemplate(
        customerName,
        contractNumber,
        language
      );

      return await this.sendEmail({
        to: customerEmail,
        subject: defaultTemplate.subject,
        body: defaultTemplate.body,
        templateId: 'warranty_created',
        language,
      });
    }
  }

  /**
   * Get default warranty email template
   */
  private getDefaultWarrantyTemplate(
    customerName: string,
    contractNumber: string,
    language: 'fr' | 'en'
  ): { subject: string; body: string } {
    if (language === 'fr') {
      return {
        subject: `Confirmation de votre garantie #${contractNumber}`,
        body: `Bonjour ${customerName},

Nous confirmons la création de votre garantie prolongée.

Numéro de contrat: ${contractNumber}

Vous pouvez consulter les détails de votre garantie dans votre espace client.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe ${APP_CONFIG.company.name}`,
      };
    } else {
      return {
        subject: `Your Warranty Confirmation #${contractNumber}`,
        body: `Hello ${customerName},

We confirm the creation of your extended warranty.

Contract Number: ${contractNumber}

You can view your warranty details in your customer portal.

For any questions, please don't hesitate to contact us.

Best regards,
The ${APP_CONFIG.company.name} Team`,
      };
    }
  }

  /**
   * Send claim status update email
   */
  async sendClaimStatusEmail(
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

    const subject =
      language === 'fr'
        ? `Mise à jour de votre réclamation #${claimNumber}`
        : `Update on Your Claim #${claimNumber}`;

    const body =
      language === 'fr'
        ? `Bonjour ${customerName},

Votre réclamation #${claimNumber} a été ${statusText.fr[status as keyof typeof statusText.fr] || status}.

Vous pouvez consulter les détails dans votre espace client.

Cordialement,
L'équipe ${APP_CONFIG.company.name}`
        : `Hello ${customerName},

Your claim #${claimNumber} has been ${statusText.en[status as keyof typeof statusText.en] || status}.

You can view the details in your customer portal.

Best regards,
The ${APP_CONFIG.company.name} Team`;

    return await this.sendEmail({
      to: customerEmail,
      subject,
      body,
      templateId: 'claim_status_update',
      language,
    });
  }

  /**
   * Send warranty expiration reminder
   */
  async sendWarrantyExpirationReminder(
    customerEmail: string,
    customerName: string,
    contractNumber: string,
    daysRemaining: number,
    language: 'fr' | 'en' = 'fr'
  ): Promise<{ success: boolean; error?: string }> {
    const subject =
      language === 'fr'
        ? `Votre garantie expire dans ${daysRemaining} jours`
        : `Your Warranty Expires in ${daysRemaining} Days`;

    const body =
      language === 'fr'
        ? `Bonjour ${customerName},

Votre garantie #${contractNumber} expire dans ${daysRemaining} jours.

Nous vous recommandons de renouveler votre garantie pour continuer à bénéficier de notre protection.

Contactez-nous pour plus d'informations sur le renouvellement.

Cordialement,
L'équipe ${APP_CONFIG.company.name}`
        : `Hello ${customerName},

Your warranty #${contractNumber} expires in ${daysRemaining} days.

We recommend renewing your warranty to continue benefiting from our protection.

Contact us for more information about renewal.

Best regards,
The ${APP_CONFIG.company.name} Team`;

    return await this.sendEmail({
      to: customerEmail,
      subject,
      body,
      templateId: 'warranty_expiration_reminder',
      language,
    });
  }

  /**
   * Get all email templates
   */
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('template_type', 'email')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching email templates', error as Error);
      return [];
    }
  }

  /**
   * Send test email
   */
  async testEmail(email: string): Promise<EmailResult> {
    return await this.sendEmail({
      to: email,
      subject: `${APP_CONFIG.email.defaultTestSubject} - ${APP_CONFIG.company.name}`,
      body: 'Ceci est un email de test. Si vous recevez ce message, la configuration email fonctionne correctement!',
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export individual functions for backward compatibility
export const sendEmail = (options: EmailOptions) => emailService.sendEmail(options);
export const sendWarrantyCreatedEmail = (...args: Parameters<typeof emailService.sendWarrantyCreatedEmail>) =>
  emailService.sendWarrantyCreatedEmail(...args);
export const sendClaimStatusEmail = (...args: Parameters<typeof emailService.sendClaimStatusEmail>) =>
  emailService.sendClaimStatusEmail(...args);
export const sendWarrantyExpirationReminder = (...args: Parameters<typeof emailService.sendWarrantyExpirationReminder>) =>
  emailService.sendWarrantyExpirationReminder(...args);
export const getEmailTemplates = () => emailService.getEmailTemplates();
export const testEmail = (email: string) => emailService.testEmail(email);
