import { supabase } from './supabase';
import { BaseAppError, ErrorSeverity, ErrorContext, isAppError, ErrorCode } from './error-types';
import { errorFingerprintGenerator } from './error-fingerprint';
import { breadcrumbTracker, BreadcrumbCategory, BreadcrumbLevel } from './error-breadcrumbs';
import { errorDebugger } from './error-debugger';
import { errorLogger as basicErrorLogger } from './error-logger';

export interface EnhancedErrorLogOptions {
  captureSnapshot?: boolean;
  captureBreadcrumbs?: boolean;
  notifyAdmins?: boolean;
  skipFingerprinting?: boolean;
  additionalContext?: Record<string, any>;
}

export class EnhancedErrorLogger {
  private static instance: EnhancedErrorLogger;
  private errorQueue: Array<{
    error: BaseAppError | Error;
    options: EnhancedErrorLogOptions;
  }> = [];
  private isProcessing = false;

  private constructor() {
    this.startQueueProcessor();
  }

  static getInstance(): EnhancedErrorLogger {
    if (!EnhancedErrorLogger.instance) {
      EnhancedErrorLogger.instance = new EnhancedErrorLogger();
    }
    return EnhancedErrorLogger.instance;
  }

  async logError(
    error: BaseAppError | Error,
    context?: Partial<ErrorContext>,
    options: EnhancedErrorLogOptions = {}
  ): Promise<string | null> {
    const defaultOptions: EnhancedErrorLogOptions = {
      captureSnapshot: true,
      captureBreadcrumbs: true,
      notifyAdmins: false,
      skipFingerprinting: false,
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.errorQueue.push({ error, options: finalOptions });

    try {
      return await this.processError(error, context, finalOptions);
    } catch (logError) {
      console.error('Failed to log error:', logError);
      return null;
    }
  }

  private async processError(
    error: BaseAppError | Error,
    context?: Partial<ErrorContext>,
    options: EnhancedErrorLogOptions = {}
  ): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user?.id || '')
      .maybeSingle();

    const organizationId = profile?.organization_id;

    let fingerprintId: string | undefined;
    if (!options.skipFingerprinting) {
      fingerprintId = errorFingerprintGenerator.generateFingerprint(error, {
        userId: user?.id,
        organizationId,
        ...context,
      });

      await this.saveFingerprintToDatabase(fingerprintId, error, organizationId, user?.id);
    }

    if (options.captureBreadcrumbs) {
      breadcrumbTracker.recordError(error, {
        fingerprintId,
        organizationId,
        userId: user?.id,
      });
    }

    let snapshotId: string | undefined;
    if (options.captureSnapshot) {
      const snapshot = errorDebugger.captureErrorSnapshot(error, {
        userId: user?.id,
        organizationId,
        ...context,
      });
      snapshotId = snapshot.id;

      await this.saveSnapshotToDatabase(snapshot, organizationId);
    }

    const errorLogId = await basicErrorLogger.logError(error, {
      ...context,
      userId: user?.id,
      organizationId,
      additionalData: {
        ...context?.additionalData,
        fingerprintId,
        snapshotId,
        ...options.additionalContext,
      },
    });

    if (options.captureBreadcrumbs && errorLogId) {
      await this.saveBreadcrumbsToDatabase(errorLogId, organizationId, user?.id);
    }

    if (options.notifyAdmins && isAppError(error) && error.severity === ErrorSeverity.CRITICAL) {
      await this.notifyAdministrators(error, organizationId, fingerprintId);
    }

    return errorLogId;
  }

  private async saveFingerprintToDatabase(
    fingerprintId: string,
    error: BaseAppError | Error,
    organizationId?: string,
    userId?: string
  ): Promise<void> {
    try {
      const fingerprint = errorFingerprintGenerator.getFingerprint(fingerprintId);
      if (!fingerprint) return;

      const errorCode = error instanceof BaseAppError ? error.code : ErrorCode.UNKNOWN_ERROR;

      await supabase.rpc('upsert_error_fingerprint', {
        p_fingerprint_id: fingerprintId,
        p_organization_id: organizationId || null,
        p_error_code: errorCode,
        p_normalized_message: fingerprint.normalizedMessage,
        p_stack_hash: fingerprint.stackHash,
        p_component_path: fingerprint.componentPath || null,
        p_user_id: userId || null,
      });
    } catch (error) {
      console.error('Failed to save fingerprint to database:', error);
    }
  }

  private async saveBreadcrumbsToDatabase(
    errorLogId: string,
    organizationId?: string,
    userId?: string
  ): Promise<void> {
    try {
      const breadcrumbs = breadcrumbTracker.getLastBreadcrumbs(30);

      const breadcrumbRecords = breadcrumbs.map((crumb, index) => ({
        error_log_id: errorLogId,
        organization_id: organizationId,
        user_id: userId,
        category: crumb.category,
        level: crumb.level,
        message: crumb.message,
        data: crumb.data || {},
        timestamp: crumb.timestamp,
        sequence_number: index,
      }));

      if (breadcrumbRecords.length > 0) {
        await supabase.from('error_breadcrumbs').insert(breadcrumbRecords);
      }
    } catch (error) {
      console.error('Failed to save breadcrumbs to database:', error);
    }
  }

  private async saveSnapshotToDatabase(snapshot: any, organizationId?: string): Promise<void> {
    try {
      await supabase.from('error_logs').update({
        context: {
          ...snapshot,
          organizationId,
        },
      });
    } catch (error) {
      console.error('Failed to save snapshot to database:', error);
    }
  }

  private async notifyAdministrators(
    error: BaseAppError,
    organizationId?: string,
    fingerprintId?: string
  ): Promise<void> {
    try {
      const { data: alerts } = await supabase
        .from('error_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('enabled', true)
        .or(`error_code.eq.${error.code},error_code.is.null`);

      if (alerts && alerts.length > 0) {
        for (const alert of alerts) {
          if (this.shouldTriggerAlert(alert, error)) {
            await this.sendAlert(alert, error, fingerprintId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to notify administrators:', error);
    }
  }

  private shouldTriggerAlert(alert: any, error: BaseAppError): boolean {
    if (alert.severity_threshold) {
      const severityLevels = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };

      const alertLevel = severityLevels[alert.severity_threshold as keyof typeof severityLevels];
      const errorLevel = severityLevels[error.severity];

      if (errorLevel < alertLevel) {
        return false;
      }
    }

    return true;
  }

  private async sendAlert(alert: any, error: BaseAppError, fingerprintId?: string): Promise<void> {
    try {
      if (alert.notification_channels?.includes('email') && alert.recipient_emails?.length > 0) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: alert.recipient_emails,
            subject: `Critical Error Alert: ${error.code}`,
            body: `
              <h2>Critical Error Detected</h2>
              <p><strong>Error Code:</strong> ${error.code}</p>
              <p><strong>Message:</strong> ${error.message}</p>
              <p><strong>Severity:</strong> ${error.severity}</p>
              <p><strong>Fingerprint ID:</strong> ${fingerprintId || 'N/A'}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
              <p>Please investigate this error immediately.</p>
            `,
          },
        });
      }

      if (alert.webhook_url) {
        await fetch(alert.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: alert.name,
            error: {
              code: error.code,
              message: error.message,
              severity: error.severity,
              fingerprintId,
            },
            timestamp: new Date().toISOString(),
          }),
        });
      }

      await supabase
        .from('error_alerts')
        .update({
          last_triggered_at: new Date().toISOString(),
          trigger_count: supabase.sql`trigger_count + 1`,
        })
        .eq('id', alert.id);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  async logRecoveryAttempt(
    errorLogId: string,
    strategy: string,
    success: boolean,
    durationMs: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id || '')
        .maybeSingle();

      await supabase.from('error_recovery_attempts').insert({
        error_log_id: errorLogId,
        organization_id: profile?.organization_id,
        strategy,
        success,
        duration_ms: durationMs,
        error_message: errorMessage,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('Failed to log recovery attempt:', error);
    }
  }

  async getErrorAnalytics(organizationId: string, hours: number = 24): Promise<any> {
    try {
      const { data: trends } = await supabase.rpc('get_error_trends', {
        p_organization_id: organizationId,
        p_hours: hours,
      });

      const { data: topErrors } = await supabase
        .from('error_fingerprints')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('severity_score', { ascending: false })
        .limit(10);

      const { data: recoveryStats } = await supabase
        .from('error_recovery_attempts')
        .select('strategy, success')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

      return {
        trends,
        topErrors,
        recoveryStats,
      };
    } catch (error) {
      console.error('Failed to get error analytics:', error);
      return null;
    }
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.errorQueue.length > 0) {
        this.processQueue();
      }
    }, 1000);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.errorQueue.length > 0) {
      const item = this.errorQueue.shift();
      if (item) {
        try {
          await this.processError(item.error, undefined, item.options);
        } catch (error) {
          console.error('Failed to process queued error:', error);
        }
      }
    }

    this.isProcessing = false;
  }
}

export const enhancedErrorLogger = EnhancedErrorLogger.getInstance();

export async function logEnhancedError(
  error: BaseAppError | Error,
  context?: Partial<ErrorContext>,
  options?: EnhancedErrorLogOptions
): Promise<string | null> {
  return enhancedErrorLogger.logError(error, context, options);
}

export async function logErrorWithRecovery(
  error: BaseAppError | Error,
  recoveryAttempted: boolean,
  recoverySuccess: boolean,
  context?: Partial<ErrorContext>
): Promise<void> {
  const errorId = await logEnhancedError(error, context, {
    captureSnapshot: true,
    notifyAdmins: !recoverySuccess,
  });

  if (errorId && recoveryAttempted) {
    // This would be logged by the recovery manager
  }
}
