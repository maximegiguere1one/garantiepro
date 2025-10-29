interface ErrorContext {
  userId?: string;
  organizationId?: string;
  route?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, any>;
}

interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorMonitor {
  private readonly MAX_ERRORS_STORED = 100;
  private readonly STORAGE_KEY = 'error_monitor_reports';
  private errorQueue: ErrorReport[] = [];
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) return;

    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    this.isInitialized = true;
    this.loadStoredErrors();
  }

  captureError(
    error: Error,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): void {
    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity
    };

    this.addReport(report);
    this.persistErrors();

    if (import.meta.env.PROD && severity === 'critical') {
      this.sendToBackend(report);
    }
  }

  captureException(
    message: string,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): void {
    const error = new Error(message);
    this.captureError(error, context, severity);
  }

  private handleGlobalError(event: ErrorEvent): void {
    this.captureError(
      event.error || new Error(event.message),
      {
        component: 'Global',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      },
      'high'
    );
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    this.captureError(
      error,
      {
        component: 'Promise',
        metadata: { reason: event.reason }
      },
      'high'
    );
  }

  private addReport(report: ErrorReport): void {
    this.errorQueue.push(report);

    if (this.errorQueue.length > this.MAX_ERRORS_STORED) {
      this.errorQueue.shift();
    }
  }

  private persistErrors(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.errorQueue.slice(-50))
      );
    } catch (e) {
      console.error('Failed to persist errors:', e);
    }
  }

  private loadStoredErrors(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.errorQueue = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load stored errors:', e);
    }
  }

  private async sendToBackend(report: ErrorReport): Promise<void> {
    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        console.error('Failed to send error report');
      }
    } catch (e) {
      console.error('Failed to send error to backend:', e);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getReports(): ErrorReport[] {
    return [...this.errorQueue];
  }

  clearReports(): void {
    this.errorQueue = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getReportsBySeverity(severity: ErrorReport['severity']): ErrorReport[] {
    return this.errorQueue.filter(report => report.severity === severity);
  }

  getRecentReports(minutes: number = 5): ErrorReport[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.errorQueue.filter(
      report => new Date(report.timestamp).getTime() > cutoff
    );
  }
}

export const errorMonitor = new ErrorMonitor();
