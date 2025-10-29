export enum BreadcrumbCategory {
  Navigation = 'navigation',
  UserAction = 'user_action',
  ApiCall = 'api_call',
  StateChange = 'state_change',
  ConsoleLog = 'console',
  Error = 'error',
  PerformanceMetric = 'performance',
}

export enum BreadcrumbLevel {
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export interface Breadcrumb {
  id: string;
  timestamp: string;
  category: BreadcrumbCategory;
  level: BreadcrumbLevel;
  message: string;
  data?: Record<string, any>;
}

export class BreadcrumbTracker {
  private static instance: BreadcrumbTracker;
  private breadcrumbs: Breadcrumb[] = [];
  private readonly maxBreadcrumbs = 100;
  private isCapturingConsole = false;

  private constructor() {
    this.initializeConsoleCapture();
  }

  static getInstance(): BreadcrumbTracker {
    if (!BreadcrumbTracker.instance) {
      BreadcrumbTracker.instance = new BreadcrumbTracker();
    }
    return BreadcrumbTracker.instance;
  }

  private initializeConsoleCapture(): void {
    if (this.isCapturingConsole || typeof window === 'undefined') return;

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    console.error = (...args: any[]) => {
      this.addBreadcrumb({
        category: BreadcrumbCategory.ConsoleLog,
        level: BreadcrumbLevel.Error,
        message: args.map(arg => String(arg)).join(' '),
      });
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.addBreadcrumb({
        category: BreadcrumbCategory.ConsoleLog,
        level: BreadcrumbLevel.Warning,
        message: args.map(arg => String(arg)).join(' '),
      });
      originalConsoleWarn.apply(console, args);
    };

    console.log = (...args: any[]) => {
      this.addBreadcrumb({
        category: BreadcrumbCategory.ConsoleLog,
        level: BreadcrumbLevel.Info,
        message: args.map(arg => String(arg)).join(' '),
      });
      originalConsoleLog.apply(console, args);
    };

    this.isCapturingConsole = true;
  }

  addBreadcrumb(crumb: {
    category: BreadcrumbCategory;
    level: BreadcrumbLevel;
    message: string;
    data?: Record<string, any>;
  }): void {
    const breadcrumb: Breadcrumb = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...crumb,
    };

    this.breadcrumbs.push(breadcrumb);

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    this.persistBreadcrumbs();
  }

  recordNavigation(from: string, to: string, metadata?: Record<string, any>): void {
    this.addBreadcrumb({
      category: BreadcrumbCategory.Navigation,
      level: BreadcrumbLevel.Info,
      message: `Navigated from ${from} to ${to}`,
      data: { from, to, ...metadata },
    });
  }

  recordUserAction(action: string, target?: string, metadata?: Record<string, any>): void {
    this.addBreadcrumb({
      category: BreadcrumbCategory.UserAction,
      level: BreadcrumbLevel.Info,
      message: target ? `${action} on ${target}` : action,
      data: { action, target, ...metadata },
    });
  }

  recordApiCall(
    method: string,
    url: string,
    status?: number,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    const level = status && status >= 400 ? BreadcrumbLevel.Error : BreadcrumbLevel.Info;
    const statusText = status ? ` (${status})` : '';
    const durationText = duration ? ` in ${duration}ms` : '';

    this.addBreadcrumb({
      category: BreadcrumbCategory.ApiCall,
      level,
      message: `${method} ${url}${statusText}${durationText}`,
      data: { method, url, status, duration, ...metadata },
    });
  }

  recordStateChange(stateKey: string, oldValue: any, newValue: any, metadata?: Record<string, any>): void {
    this.addBreadcrumb({
      category: BreadcrumbCategory.StateChange,
      level: BreadcrumbLevel.Debug,
      message: `State changed: ${stateKey}`,
      data: {
        stateKey,
        oldValue: this.sanitizeValue(oldValue),
        newValue: this.sanitizeValue(newValue),
        ...metadata,
      },
    });
  }

  recordPerformanceMetric(metricName: string, value: number, metadata?: Record<string, any>): void {
    this.addBreadcrumb({
      category: BreadcrumbCategory.PerformanceMetric,
      level: BreadcrumbLevel.Info,
      message: `${metricName}: ${value.toFixed(2)}ms`,
      data: { metricName, value, ...metadata },
    });
  }

  recordError(error: Error, metadata?: Record<string, any>): void {
    this.addBreadcrumb({
      category: BreadcrumbCategory.Error,
      level: BreadcrumbLevel.Error,
      message: error.message,
      data: {
        name: error.name,
        stack: error.stack,
        ...metadata,
      },
    });
  }

  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 10 ? `Array(${value.length})` : value.slice(0, 10);
      }

      const keys = Object.keys(value);
      if (keys.length > 10) {
        return `Object with ${keys.length} keys`;
      }

      const sanitized: Record<string, any> = {};
      keys.slice(0, 10).forEach(key => {
        sanitized[key] = this.sanitizeValue(value[key]);
      });
      return sanitized;
    }

    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }

    return value;
  }

  getBreadcrumbs(options?: {
    category?: BreadcrumbCategory;
    level?: BreadcrumbLevel;
    since?: Date;
    limit?: number;
  }): Breadcrumb[] {
    let filtered = [...this.breadcrumbs];

    if (options?.category) {
      filtered = filtered.filter(b => b.category === options.category);
    }

    if (options?.level) {
      filtered = filtered.filter(b => b.level === options.level);
    }

    if (options?.since) {
      const sinceIso = options.since.toISOString();
      filtered = filtered.filter(b => b.timestamp >= sinceIso);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getLastBreadcrumbs(count: number = 20): Breadcrumb[] {
    return this.breadcrumbs.slice(-count);
  }

  getBreadcrumbsBeforeError(errorTimestamp: string, count: number = 30): Breadcrumb[] {
    const errorIndex = this.breadcrumbs.findIndex(b => b.timestamp >= errorTimestamp);
    if (errorIndex === -1) {
      return this.breadcrumbs.slice(-count);
    }
    return this.breadcrumbs.slice(Math.max(0, errorIndex - count), errorIndex);
  }

  clear(): void {
    this.breadcrumbs = [];
    this.clearPersistedBreadcrumbs();
  }

  private persistBreadcrumbs(): void {
    try {
      const toStore = this.breadcrumbs.slice(-50);
      localStorage.setItem('error_breadcrumbs', JSON.stringify(toStore));
    } catch (e) {
      console.error('Failed to persist breadcrumbs:', e);
    }
  }

  private loadPersistedBreadcrumbs(): void {
    try {
      const stored = localStorage.getItem('error_breadcrumbs');
      if (stored) {
        this.breadcrumbs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load persisted breadcrumbs:', e);
    }
  }

  private clearPersistedBreadcrumbs(): void {
    try {
      localStorage.removeItem('error_breadcrumbs');
    } catch (e) {
      console.error('Failed to clear persisted breadcrumbs:', e);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  getStatistics(): {
    total: number;
    byCategory: Record<BreadcrumbCategory, number>;
    byLevel: Record<BreadcrumbLevel, number>;
    recentActivity: number;
  } {
    const byCategory = {} as Record<BreadcrumbCategory, number>;
    const byLevel = {} as Record<BreadcrumbLevel, number>;

    Object.values(BreadcrumbCategory).forEach(cat => {
      byCategory[cat as BreadcrumbCategory] = 0;
    });
    Object.values(BreadcrumbLevel).forEach(lvl => {
      byLevel[lvl as BreadcrumbLevel] = 0;
    });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let recentActivity = 0;

    this.breadcrumbs.forEach(crumb => {
      byCategory[crumb.category]++;
      byLevel[crumb.level]++;
      if (crumb.timestamp >= fiveMinutesAgo) {
        recentActivity++;
      }
    });

    return {
      total: this.breadcrumbs.length,
      byCategory,
      byLevel,
      recentActivity,
    };
  }

  exportBreadcrumbs(): string {
    return JSON.stringify(this.breadcrumbs, null, 2);
  }

  importBreadcrumbs(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.breadcrumbs = parsed;
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import breadcrumbs:', e);
      return false;
    }
  }
}

export const breadcrumbTracker = BreadcrumbTracker.getInstance();

export function useBreadcrumbTracker() {
  return breadcrumbTracker;
}
