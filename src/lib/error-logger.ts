import { supabase } from './supabase';
import { BaseAppError, ErrorSeverity, ErrorContext, isAppError, ErrorCode } from './error-types';

export interface ErrorLogEntry {
  id?: string;
  error_code: string;
  error_message: string;
  user_message: string;
  severity: ErrorSeverity;
  user_id?: string;
  organization_id?: string;
  url?: string;
  user_agent?: string;
  stack_trace?: string;
  context?: any;
  resolved: boolean;
  created_at?: string;
}

class ErrorLogger {
  private queue: ErrorLogEntry[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000;

  async logError(error: BaseAppError | Error, context?: Partial<ErrorContext>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let errorEntry: ErrorLogEntry;

      if (isAppError(error)) {
        errorEntry = {
          error_code: error.code,
          error_message: error.message,
          user_message: error.userMessage,
          severity: error.severity,
          user_id: context?.userId || user?.id,
          organization_id: context?.organizationId,
          url: error.context?.url || context?.url || (typeof window !== 'undefined' ? window.location.href : undefined),
          user_agent: error.context?.userAgent || context?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
          stack_trace: error.stack,
          context: {
            ...error.context,
            ...context,
            originalError: error.originalError?.message,
            suggestedAction: error.suggestedAction,
            helpUrl: error.helpUrl,
          },
          resolved: false,
        };
      } else {
        errorEntry = {
          error_code: ErrorCode.UNKNOWN_ERROR,
          error_message: error.message || 'Unknown error',
          user_message: 'Une erreur inattendue s\'est produite',
          severity: ErrorSeverity.MEDIUM,
          user_id: context?.userId || user?.id,
          organization_id: context?.organizationId,
          url: context?.url || (typeof window !== 'undefined' ? window.location.href : undefined),
          user_agent: context?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
          stack_trace: error.stack,
          context,
          resolved: false,
        };
      }

      this.queue.push(errorEntry);
      this.processQueue();
    } catch (logError) {
      console.error('Failed to queue error for logging:', logError);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const entry = this.queue[0];
      const success = await this.sendToDatabase(entry);

      if (success) {
        this.queue.shift();
      } else {
        break;
      }
    }

    this.isProcessing = false;
  }

  private async sendToDatabase(entry: ErrorLogEntry, retryCount = 0): Promise<boolean> {
    try {
      const { error } = await supabase.from('error_logs').insert(entry);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to log error to database:', error);

      if (retryCount < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.sendToDatabase(entry, retryCount + 1);
      }

      return false;
    }
  }

  async getRecentErrors(limit = 50): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
      return [];
    }
  }

  async getErrorsByUser(userId: string, limit = 50): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch user error logs:', error);
      return [];
    }
  }

  async getErrorStats(): Promise<{
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCode: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('error_code, severity')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        bySeverity: {
          [ErrorSeverity.LOW]: 0,
          [ErrorSeverity.MEDIUM]: 0,
          [ErrorSeverity.HIGH]: 0,
          [ErrorSeverity.CRITICAL]: 0,
        },
        byCode: {} as Record<string, number>,
      };

      data?.forEach(log => {
        stats.bySeverity[log.severity as ErrorSeverity]++;
        stats.byCode[log.error_code] = (stats.byCode[log.error_code] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to fetch error stats:', error);
      return {
        total: 0,
        bySeverity: {
          [ErrorSeverity.LOW]: 0,
          [ErrorSeverity.MEDIUM]: 0,
          [ErrorSeverity.HIGH]: 0,
          [ErrorSeverity.CRITICAL]: 0,
        },
        byCode: {},
      };
    }
  }

  async markErrorResolved(errorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true })
        .eq('id', errorId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to mark error as resolved:', error);
      return false;
    }
  }
}

export const errorLogger = new ErrorLogger();

export function logError(error: BaseAppError | Error, context?: Partial<ErrorContext>): void {
  errorLogger.logError(error, context);

  if (isAppError(error) && error.severity === ErrorSeverity.CRITICAL) {
    console.error('CRITICAL ERROR:', error);
  }
}

export function logErrorSync(error: BaseAppError | Error, context?: Partial<ErrorContext>): void {
  console.error('Error:', error);
  errorLogger.logError(error, context);
}

export async function getErrorLogs(limit?: number): Promise<ErrorLogEntry[]> {
  return errorLogger.getRecentErrors(limit);
}

export async function getUserErrorLogs(userId: string, limit?: number): Promise<ErrorLogEntry[]> {
  return errorLogger.getErrorsByUser(userId, limit);
}

export async function getErrorStatistics(): Promise<{
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCode: Record<string, number>;
}> {
  return errorLogger.getErrorStats();
}
