interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  initialize() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observeLongTasks();
    this.observeLayoutShifts();
  }

  private observeNavigationTiming() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    const navEntries = window.performance.getEntriesByType(
      'navigation'
    ) as PerformanceNavigationTiming[];

    if (navEntries.length > 0) {
      const nav = navEntries[0];

      this.recordMetric('DNS', nav.domainLookupEnd - nav.domainLookupStart);
      this.recordMetric('TCP', nav.connectEnd - nav.connectStart);
      this.recordMetric('Request', nav.responseStart - nav.requestStart);
      this.recordMetric('Response', nav.responseEnd - nav.responseStart);
      this.recordMetric('DOM Processing', nav.domComplete - nav.domInteractive);
      this.recordMetric('Load Complete', nav.loadEventEnd - nav.loadEventStart);
      this.recordMetric('Total Load Time', nav.loadEventEnd - nav.fetchStart);
    }
  }

  private observeResourceTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming;

          if (resource.duration > 1000) {
            this.recordMetric(
              `Slow Resource: ${this.getResourceName(resource.name)}`,
              resource.duration,
              resource.name
            );
          }

          if (resource.transferSize > 500000) {
            this.recordMetric(
              `Large Resource: ${this.getResourceName(resource.name)}`,
              resource.transferSize / 1024,
              resource.name
            );
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource timing observation failed:', error);
    }
  }

  private observeLongTasks() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            this.recordMetric('Long Task', entry.duration);
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (error) {
      // longtask not supported in all browsers
    }
  }

  private observeLayoutShifts() {
    try {
      let clsValue = 0;

      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('Cumulative Layout Shift', clsValue);
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      // layout-shift not supported in all browsers
    }
  }

  recordMetric(name: string, value: number, url?: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url,
    };

    this.metrics.push(metric);

    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.recordMetric(name, duration);

    if (duration > 100) {
      console.warn(`Slow function ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.recordMetric(name, duration);

    if (duration > 1000) {
      console.warn(`Slow async operation ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  getSlowMetrics(threshold = 100): PerformanceMetric[] {
    return this.metrics.filter((m) => m.value > threshold);
  }

  getSummary() {
    const summary: Record<string, { count: number; avg: number; max: number; min: number }> = {};

    this.metrics.forEach((metric) => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          avg: 0,
          max: -Infinity,
          min: Infinity,
        };
      }

      const s = summary[metric.name];
      s.count++;
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
      s.max = Math.max(s.max, metric.value);
      s.min = Math.min(s.min, metric.value);
    });

    return summary;
  }

  exportMetrics(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        metrics: this.metrics,
        summary: this.getSummary(),
      },
      null,
      2
    );
  }

  clear() {
    this.metrics = [];
  }

  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }

  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  }

  logPerformanceReport() {
    const summary = this.getSummary();
    const slowMetrics = this.getSlowMetrics();

    console.group('⚡ Performance Report');
    console.table(summary);

    if (slowMetrics.length > 0) {
      console.warn('🐌 Slow Operations:', slowMetrics);
    }

    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function markPerformance(name: string) {
  performance.mark(name);
}

export function measurePerformance(name: string, startMark: string, endMark?: string) {
  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }

    const measures = performance.getEntriesByName(name, 'measure');
    if (measures.length > 0) {
      const measure = measures[measures.length - 1];
      performanceMonitor.recordMetric(name, measure.duration);
    }
  } catch (error) {
    console.warn('Performance measurement failed:', error);
  }
}

if (typeof window !== 'undefined') {
  performanceMonitor.initialize();

  window.addEventListener('beforeunload', () => {
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.logPerformanceReport();
    }
  });
}

export default performanceMonitor;
