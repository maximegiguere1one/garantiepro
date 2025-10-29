interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface WebVitalsMetrics {
  LCP?: number;
  FID?: number;
  CLS?: number;
  FCP?: number;
  TTFB?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVitalsMetrics = {};
  private observer: PerformanceObserver | null = null;

  initialize(): void {
    if (typeof window === 'undefined') return;

    this.observeWebVitals();
    this.trackNavigationTiming();
    this.trackResourceTiming();
  }

  private observeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processEntry(entry);
        }
      });

      this.observer.observe({
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint', 'navigation']
      });
    } catch (e) {
      console.error('Failed to observe web vitals:', e);
    }
  }

  private processEntry(entry: PerformanceEntry): void {
    if (entry.entryType === 'largest-contentful-paint') {
      this.webVitals.LCP = entry.startTime;
      this.recordMetric('LCP', entry.startTime);
    } else if (entry.entryType === 'first-input') {
      const fidEntry = entry as PerformanceEventTiming;
      this.webVitals.FID = fidEntry.processingStart - fidEntry.startTime;
      this.recordMetric('FID', this.webVitals.FID);
    } else if (entry.entryType === 'layout-shift') {
      const clsEntry = entry as LayoutShift;
      if (!clsEntry.hadRecentInput) {
        this.webVitals.CLS = (this.webVitals.CLS || 0) + clsEntry.value;
        this.recordMetric('CLS', this.webVitals.CLS);
      }
    } else if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
      this.webVitals.FCP = entry.startTime;
      this.recordMetric('FCP', entry.startTime);
    } else if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      this.webVitals.TTFB = navEntry.responseStart - navEntry.requestStart;
      this.recordMetric('TTFB', this.webVitals.TTFB);
    }
  }

  private trackNavigationTiming(): void {
    if (!('performance' in window) || !performance.getEntriesByType) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    this.recordMetric('DNS_Lookup', navigation.domainLookupEnd - navigation.domainLookupStart);
    this.recordMetric('TCP_Connection', navigation.connectEnd - navigation.connectStart);
    this.recordMetric('Request_Time', navigation.responseStart - navigation.requestStart);
    this.recordMetric('Response_Time', navigation.responseEnd - navigation.responseStart);
    this.recordMetric('DOM_Processing', navigation.domComplete - navigation.domInteractive);
    this.recordMetric('Load_Complete', navigation.loadEventEnd - navigation.loadEventStart);
  }

  private trackResourceTiming(): void {
    if (!('performance' in window) || !performance.getEntriesByType) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const resourcesByType: Record<string, number[]> = {};

    resources.forEach(resource => {
      const type = this.getResourceType(resource.name);
      if (!resourcesByType[type]) {
        resourcesByType[type] = [];
      }
      resourcesByType[type].push(resource.duration);
    });

    Object.entries(resourcesByType).forEach(([type, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      this.recordMetric(`Resource_${type}_Avg`, avg, { count: durations.length });
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'JavaScript';
    if (url.includes('.css')) return 'CSS';
    if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)/)) return 'Image';
    if (url.includes('api') || url.includes('supabase')) return 'API';
    return 'Other';
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata
    });

    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(`Function_${name}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`Function_${name}_Error`, duration);
      throw error;
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(`Async_${name}`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`Async_${name}_Error`, duration);
      throw error;
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getWebVitals(): WebVitalsMetrics {
    return { ...this.webVitals };
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  getReport(): {
    webVitals: WebVitalsMetrics;
    slowestOperations: PerformanceMetric[];
    averages: Record<string, number>;
  } {
    const uniqueNames = [...new Set(this.metrics.map(m => m.name))];
    const averages: Record<string, number> = {};

    uniqueNames.forEach(name => {
      averages[name] = this.getAverageMetric(name);
    });

    const slowestOperations = [...this.metrics]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      webVitals: this.webVitals,
      slowestOperations,
      averages
    };
  }

  clear(): void {
    this.metrics = [];
    this.webVitals = {};
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
