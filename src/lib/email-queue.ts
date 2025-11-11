import { supabase } from './supabase';
import { sendEmail, EmailOptions, EmailResult } from './email-utils';
import { createLogger } from './logger';

const logger = createLogger('[EmailQueue]');

interface QueuedEmail {
  id: string;
  options: EmailOptions;
  attempts: number;
  lastError?: string;
  maxRetries: number;
  nextRetryAt: Date;
}

const emailQueue: QueuedEmail[] = [];
const MAX_RETRIES = 3;
const RETRY_DELAYS = [60000, 300000, 900000];
let isProcessing = false;

export async function queueEmail(options: EmailOptions, maxRetries: number = MAX_RETRIES): Promise<string> {
  const queueId = crypto.randomUUID();

  emailQueue.push({
    id: queueId,
    options,
    attempts: 0,
    maxRetries,
    nextRetryAt: new Date(),
  });

  try {
    // Use new column names: to_email, html_body, metadata
    await supabase.from('email_queue').insert({
      id: queueId,
      to_email: options.to,
      from_email: 'info@garantieproremorque.com', // Default, can be overridden
      subject: options.subject,
      html_body: options.body,
      metadata: {
        template_id: options.templateId,
        variables: options.variables,
      },
      status: 'queued',
      attempts: 0,
      max_retries: maxRetries,
      next_retry_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to persist queued email:', error);
  }

  if (!isProcessing) {
    processQueue();
  }

  return queueId;
}

async function processQueue(): Promise<void> {
  if (isProcessing || emailQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (emailQueue.length > 0) {
    const now = new Date();
    const readyEmails = emailQueue.filter(email => email.nextRetryAt <= now);

    if (readyEmails.length === 0) {
      const nextRetry = Math.min(
        ...emailQueue.map(e => e.nextRetryAt.getTime())
      );
      const delay = Math.max(0, nextRetry - now.getTime());

      if (delay > 0) {
        setTimeout(() => {
          isProcessing = false;
          processQueue();
        }, delay);
        return;
      }
    }

    for (const queuedEmail of readyEmails) {
      await processQueuedEmail(queuedEmail);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  isProcessing = false;
}

async function processQueuedEmail(queuedEmail: QueuedEmail): Promise<void> {
  queuedEmail.attempts++;

  try {
    const result = await sendEmail(queuedEmail.options);

    if (result.success) {
      const index = emailQueue.indexOf(queuedEmail);
      if (index > -1) {
        emailQueue.splice(index, 1);
      }

      try {
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: queuedEmail.attempts,
          })
          .eq('id', queuedEmail.id);
      } catch (error) {
        logger.error('Failed to update email queue status:', error);
      }

      logger.info(`Email ${queuedEmail.id} sent successfully after ${queuedEmail.attempts} attempts`);
    } else {
      queuedEmail.lastError = result.userMessage || result.error;

      if (queuedEmail.attempts >= queuedEmail.maxRetries) {
        const index = emailQueue.indexOf(queuedEmail);
        if (index > -1) {
          emailQueue.splice(index, 1);
        }

        try {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              error_message: queuedEmail.lastError,
              attempts: queuedEmail.attempts,
              failed_at: new Date().toISOString(),
            })
            .eq('id', queuedEmail.id);
        } catch (error) {
          logger.error('Failed to update email queue status:', error);
        }

        logger.error(`Email ${queuedEmail.id} failed permanently after ${queuedEmail.attempts} attempts:`, queuedEmail.lastError);
      } else {
        const delayIndex = Math.min(queuedEmail.attempts - 1, RETRY_DELAYS.length - 1);
        const delay = RETRY_DELAYS[delayIndex];
        queuedEmail.nextRetryAt = new Date(Date.now() + delay);

        try {
          await supabase
            .from('email_queue')
            .update({
              status: 'retry',
              error_message: queuedEmail.lastError,
              attempts: queuedEmail.attempts,
              next_retry_at: queuedEmail.nextRetryAt.toISOString(),
            })
            .eq('id', queuedEmail.id);
        } catch (error) {
          logger.error('Failed to update email queue status:', error);
        }

        logger.debug(`Email ${queuedEmail.id} will retry in ${delay / 1000}s (attempt ${queuedEmail.attempts}/${queuedEmail.maxRetries})`);
      }
    }
  } catch (error: any) {
    logger.error(`Error processing queued email ${queuedEmail.id}:`, error);
    queuedEmail.lastError = error.message || 'Unknown error';

    if (queuedEmail.attempts >= queuedEmail.maxRetries) {
      const index = emailQueue.indexOf(queuedEmail);
      if (index > -1) {
        emailQueue.splice(index, 1);
      }
    } else {
      const delayIndex = Math.min(queuedEmail.attempts - 1, RETRY_DELAYS.length - 1);
      const delay = RETRY_DELAYS[delayIndex];
      queuedEmail.nextRetryAt = new Date(Date.now() + delay);
    }
  }
}

export async function loadQueueFromDatabase(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('email_queue')
      .select('*')
      .in('status', ['queued', 'retry'])
      .order('next_retry_at', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      for (const item of data) {
        const metadata = (item.metadata as any) || {};
        emailQueue.push({
          id: item.id,
          options: {
            to: item.to_email,
            subject: item.subject,
            body: item.html_body,
            templateId: metadata.template_id,
            variables: metadata.variables,
          },
          attempts: item.attempts || 0,
          lastError: item.error_message,
          maxRetries: item.max_retries || MAX_RETRIES,
          nextRetryAt: new Date(item.next_retry_at),
        });
      }

      logger.info(`Loaded ${data.length} emails from queue`);
      processQueue();
    }
  } catch (error) {
    logger.error('Failed to load email queue from database:', error);
  }
}

export async function processQueuedEmailsInBackground(): Promise<void> {
  try {
    logger.debug('Starting background email processor');

    const { data: queuedEmails, error } = await supabase
      .from('email_queue')
      .select('*')
      .in('status', ['queued', 'retry'])
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(10);

    if (error) throw error;

    if (!queuedEmails || queuedEmails.length === 0) {
      logger.debug('No emails to process');
      return;
    }

    logger.info(`Processing ${queuedEmails.length} queued emails`);

    for (const email of queuedEmails) {
      try {
        await supabase
          .from('email_queue')
          .update({ status: 'sending' })
          .eq('id', email.id);

        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email.to_email,
            subject: email.subject,
            body: email.html_body
          })
        });

        if (response.ok) {
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: email.attempts + 1
            })
            .eq('id', email.id);

          logger.info(`Email ${email.id} sent successfully`);
        } else {
          const errorData = await response.json();
          const newAttempts = email.attempts + 1;

          if (newAttempts >= email.max_retries) {
            await supabase
              .from('email_queue')
              .update({
                status: 'failed',
                error_message: errorData.userMessage || errorData.error,
                attempts: newAttempts,
                failed_at: new Date().toISOString()
              })
              .eq('id', email.id);

            logger.error(`Email ${email.id} failed permanently after ${newAttempts} attempts`);
          } else {
            const delayIndex = Math.min(newAttempts - 1, RETRY_DELAYS.length - 1);
            const nextRetry = new Date(Date.now() + RETRY_DELAYS[delayIndex]);

            await supabase
              .from('email_queue')
              .update({
                status: 'retry',
                error_message: errorData.userMessage || errorData.error,
                attempts: newAttempts,
                next_retry_at: nextRetry.toISOString()
              })
              .eq('id', email.id);

            logger.debug(`Email ${email.id} scheduled for retry at ${nextRetry.toISOString()}`);
          }
        }
      } catch (emailError: any) {
        logger.error(`Error processing email ${email.id}:`, emailError);

        const newAttempts = email.attempts + 1;
        if (newAttempts >= email.max_retries) {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              error_message: emailError.message,
              attempts: newAttempts,
              failed_at: new Date().toISOString()
            })
            .eq('id', email.id);
        } else {
          const delayIndex = Math.min(newAttempts - 1, RETRY_DELAYS.length - 1);
          const nextRetry = new Date(Date.now() + RETRY_DELAYS[delayIndex]);

          await supabase
            .from('email_queue')
            .update({
              status: 'retry',
              error_message: emailError.message,
              attempts: newAttempts,
              next_retry_at: nextRetry.toISOString()
            })
            .eq('id', email.id);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('Background processing completed');
  } catch (error) {
    logger.error('Error in background processor:', error);
  }
}

export function startEmailQueueProcessor(): void {
  logger.info('Starting email queue processor');

  loadQueueFromDatabase();

  setInterval(() => {
    processQueuedEmailsInBackground();
  }, 60000);

  setTimeout(() => {
    processQueuedEmailsInBackground();
  }, 5000);
}

export function getQueueStatus(): {
  queueLength: number;
  isProcessing: boolean;
  emails: Array<{
    id: string;
    to: string;
    subject: string;
    attempts: number;
    maxRetries: number;
    nextRetryAt: Date;
    lastError?: string;
  }>;
} {
  return {
    queueLength: emailQueue.length,
    isProcessing,
    emails: emailQueue.map(e => ({
      id: e.id,
      to: e.options.to,
      subject: e.options.subject,
      attempts: e.attempts,
      maxRetries: e.maxRetries,
      nextRetryAt: e.nextRetryAt,
      lastError: e.lastError,
    })),
  };
}
