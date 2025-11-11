import { BaseAppError, ErrorContext } from './error-types';
import { breadcrumbTracker, Breadcrumb } from './error-breadcrumbs';
import { errorFingerprintGenerator } from './error-fingerprint';

export interface ErrorSnapshot {
  id: string;
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    code?: string;
    severity?: string;
  };
  context: ErrorContext;
  breadcrumbs: Breadcrumb[];
  applicationState: Record<string, any>;
  networkRequests: NetworkRequest[];
  consoleLog: ConsoleEntry[];
  performanceMetrics: PerformanceMetrics;
  environmentInfo: EnvironmentInfo;
}

export interface NetworkRequest {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: string;
}

export interface ConsoleEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  args: any[];
}

export interface PerformanceMetrics {
  pageLoadTime?: number;
  timeToInteractive?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface EnvironmentInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  viewport: string;
  timezone: string;
  onlineStatus: boolean;
  cookiesEnabled: boolean;
}

export class ErrorDebugger {
  private static instance: ErrorDebugger;
  private snapshots: ErrorSnapshot[] = [];
  private networkRequests: NetworkRequest[] = [];
  private consoleEntries: ConsoleEntry[] = [];
  private readonly maxSnapshots = 50;
  private readonly maxNetworkRequests = 100;
  private readonly maxConsoleEntries = 200;
  private isCapturingNetwork = false;
  private isCapturingConsole = false;
  private stateCaptureFn?: () => Record<string, any>;

  private constructor() {
    this.initializeNetworkCapture();
    this.initializeConsoleCapture();
  }

  static getInstance(): ErrorDebugger {
    if (!ErrorDebugger.instance) {
      ErrorDebugger.instance = new ErrorDebugger();
    }
    return ErrorDebugger.instance;
  }

  setStateCapture(fn: () => Record<string, any>): void {
    this.stateCaptureFn = fn;
  }

  private initializeNetworkCapture(): void {
    if (this.isCapturingNetwork || typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args): Promise<Response> => {
      const requestId = this.generateId();
      const startTime = Date.now();
      const [url, options] = args;

      const networkRequest: NetworkRequest = {
        id: requestId,
        timestamp: new Date().toISOString(),
        method: options?.method || 'GET',
        url: typeof url === 'string' ? url : url.toString(),
        requestHeaders: options?.headers as any,
        requestBody: options?.body,
      };

      try {
        const response = await originalFetch(...args);
        const clonedResponse = response.clone();

        networkRequest.status = response.status;
        networkRequest.duration = Date.now() - startTime;
        networkRequest.responseHeaders = Object.fromEntries(response.headers.entries());

        try {
          networkRequest.responseBody = await clonedResponse.json();
        } catch {
          networkRequest.responseBody = await clonedResponse.text();
        }

        this.addNetworkRequest(networkRequest);
        return response;
      } catch (error: any) {
        networkRequest.error = error.message;
        networkRequest.duration = Date.now() - startTime;
        this.addNetworkRequest(networkRequest);
        throw error;
      }
    };

    this.isCapturingNetwork = true;
  }

  private initializeConsoleCapture(): void {
    if (this.isCapturingConsole || typeof window === 'undefined') return;

    const captureConsole = (level: 'log' | 'info' | 'warn' | 'error', original: any) => {
      return (...args: any[]) => {
        this.addConsoleEntry({
          timestamp: new Date().toISOString(),
          level,
          message: args.map(arg => String(arg)).join(' '),
          args,
        });
        original.apply(console, args);
      };
    };

    console.log = captureConsole('log', console.log);
    console.info = captureConsole('info', console.info);
    console.warn = captureConsole('warn', console.warn);
    console.error = captureConsole('error', console.error);

    this.isCapturingConsole = true;
  }

  private addNetworkRequest(request: NetworkRequest): void {
    this.networkRequests.push(request);
    if (this.networkRequests.length > this.maxNetworkRequests) {
      this.networkRequests.shift();
    }
  }

  private addConsoleEntry(entry: ConsoleEntry): void {
    this.consoleEntries.push(entry);
    if (this.consoleEntries.length > this.maxConsoleEntries) {
      this.consoleEntries.shift();
    }
  }

  captureErrorSnapshot(error: Error | BaseAppError, context?: ErrorContext): ErrorSnapshot {
    const snapshot: ErrorSnapshot = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error instanceof BaseAppError ? error.code : undefined,
        severity: error instanceof BaseAppError ? error.severity : undefined,
      },
      context: context || this.createDefaultContext(),
      breadcrumbs: breadcrumbTracker.getLastBreadcrumbs(50),
      applicationState: this.captureApplicationState(),
      networkRequests: this.getRecentNetworkRequests(20),
      consoleLog: this.getRecentConsoleEntries(50),
      performanceMetrics: this.capturePerformanceMetrics(),
      environmentInfo: this.captureEnvironmentInfo(),
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.persistSnapshot(snapshot);
    return snapshot;
  }

  private captureApplicationState(): Record<string, any> {
    if (this.stateCaptureFn) {
      try {
        return this.stateCaptureFn();
      } catch (error) {
        console.error('Failed to capture application state:', error);
        return { error: 'Failed to capture state' };
      }
    }
    return {};
  }

  private capturePerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        metrics.timeToInteractive = navigation.domInteractive - navigation.fetchStart;
      }

      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        metrics.firstContentfulPaint = fcp.startTime;
      }

      if ((performance as any).memory) {
        metrics.memoryUsage = {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
    }

    return metrics;
  }

  private captureEnvironmentInfo(): EnvironmentInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        platform: '',
        language: '',
        screenResolution: '',
        viewport: '',
        timezone: '',
        onlineStatus: false,
        cookiesEnabled: false,
      };
    }

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onlineStatus: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
    };
  }

  private createDefaultContext(): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
  }

  private getRecentNetworkRequests(count: number): NetworkRequest[] {
    return this.networkRequests.slice(-count);
  }

  private getRecentConsoleEntries(count: number): ConsoleEntry[] {
    return this.consoleEntries.slice(-count);
  }

  getSnapshot(id: string): ErrorSnapshot | undefined {
    return this.snapshots.find(s => s.id === id);
  }

  getAllSnapshots(): ErrorSnapshot[] {
    return [...this.snapshots];
  }

  getRecentSnapshots(count: number = 10): ErrorSnapshot[] {
    return this.snapshots.slice(-count);
  }

  exportSnapshot(id: string): string {
    const snapshot = this.getSnapshot(id);
    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }
    return JSON.stringify(snapshot, null, 2);
  }

  exportAllSnapshots(): string {
    return JSON.stringify(this.snapshots, null, 2);
  }

  importSnapshot(data: string): boolean {
    try {
      const snapshot = JSON.parse(data) as ErrorSnapshot;
      this.snapshots.push(snapshot);
      return true;
    } catch (error) {
      console.error('Failed to import snapshot:', error);
      return false;
    }
  }

  clearSnapshots(): void {
    this.snapshots = [];
    localStorage.removeItem('error_snapshots');
  }

  private persistSnapshot(snapshot: ErrorSnapshot): void {
    try {
      const toStore = this.snapshots.slice(-10);
      localStorage.setItem('error_snapshots', JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to persist snapshot:', error);
    }
  }

  private loadPersistedSnapshots(): void {
    try {
      const stored = localStorage.getItem('error_snapshots');
      if (stored) {
        this.snapshots = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load persisted snapshots:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  generateReproductionSteps(snapshotId: string): string[] {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) {
      return ['Snapshot not found'];
    }

    const steps: string[] = [
      'Reproduction Steps:',
      '',
      `1. Environment Setup:`,
      `   - User Agent: ${snapshot.environmentInfo.userAgent}`,
      `   - Screen Resolution: ${snapshot.environmentInfo.screenResolution}`,
      `   - Viewport: ${snapshot.environmentInfo.viewport}`,
      '',
      `2. Initial State:`,
    ];

    Object.entries(snapshot.applicationState).forEach(([key, value]) => {
      steps.push(`   - ${key}: ${JSON.stringify(value)}`);
    });

    steps.push('', '3. User Actions:');
    snapshot.breadcrumbs
      .filter(b => b.category === 'user_action' || b.category === 'navigation')
      .forEach((crumb, index) => {
        steps.push(`   ${index + 1}. ${crumb.message}`);
      });

    steps.push('', '4. API Calls Made:');
    snapshot.networkRequests.forEach((req, index) => {
      steps.push(`   ${index + 1}. ${req.method} ${req.url} (${req.status || 'pending'})`);
    });

    steps.push('', `5. Error Occurred:`, `   ${snapshot.error.message}`);

    return steps;
  }

  getDebugSummary(snapshotId: string): Record<string, any> {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) {
      return {};
    }

    return {
      errorMessage: snapshot.error.message,
      errorCode: snapshot.error.code,
      timestamp: snapshot.timestamp,
      userActions: snapshot.breadcrumbs.filter(b => b.category === 'user_action').length,
      apiCallsMade: snapshot.networkRequests.length,
      failedApiCalls: snapshot.networkRequests.filter(r => r.error || (r.status && r.status >= 400)).length,
      consoleErrors: snapshot.consoleLog.filter(e => e.level === 'error').length,
      performanceIssues: this.identifyPerformanceIssues(snapshot.performanceMetrics),
      environment: snapshot.environmentInfo,
    };
  }

  private identifyPerformanceIssues(metrics: PerformanceMetrics): string[] {
    const issues: string[] = [];

    if (metrics.pageLoadTime && metrics.pageLoadTime > 3000) {
      issues.push(`Slow page load: ${metrics.pageLoadTime}ms`);
    }

    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      issues.push(`Poor LCP: ${metrics.largestContentfulPaint}ms`);
    }

    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      issues.push(`High CLS: ${metrics.cumulativeLayoutShift}`);
    }

    if (metrics.memoryUsage) {
      const usagePercent = (metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.jsHeapSizeLimit) * 100;
      if (usagePercent > 80) {
        issues.push(`High memory usage: ${usagePercent.toFixed(1)}%`);
      }
    }

    return issues;
  }
}

export const errorDebugger = ErrorDebugger.getInstance();
