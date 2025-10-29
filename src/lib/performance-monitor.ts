interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled = true;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  measure(name: string): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.getAllMetrics().filter(
      (metric) => metric.duration && metric.duration > threshold
    );
  }

  clear(): void {
    this.metrics.clear();
  }

  logSummary(): void {
    if (!this.enabled) return;

    const metrics = this.getAllMetrics();
    const completed = metrics.filter((m) => m.duration);

    if (completed.length === 0) {
      console.log('No completed performance metrics');
      return;
    }

    console.group('Performance Summary');
    completed.forEach((metric) => {
      const color = metric.duration! > 1000 ? 'color: red' :
                    metric.duration! > 500 ? 'color: orange' :
                    'color: green';
      console.log(
        `%c${metric.name}: ${metric.duration!.toFixed(2)}ms`,
        color,
        metric.metadata
      );
    });
    console.groupEnd();
  }

  measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.mark(name, metadata);

      fn()
        .then((result) => {
          this.measure(name);
          resolve(result);
        })
        .catch((error) => {
          this.measure(name);
          reject(error);
        });
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function measurePerformance(name: string, metadata?: Record<string, any>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.mark(`${name}.${propertyKey}`, metadata);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.measure(`${name}.${propertyKey}`);
        return result;
      } catch (error) {
        performanceMonitor.measure(`${name}.${propertyKey}`);
        throw error;
      }
    };

    return descriptor;
  };
}

export function trackWebVitals(): void {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log('LCP:', entry.startTime);
      }
      if (entry.entryType === 'first-input') {
        console.log('FID:', (entry as any).processingStart - entry.startTime);
      }
      if (entry.entryType === 'layout-shift') {
        console.log('CLS:', (entry as any).value);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  } catch (e) {
    console.warn('Performance Observer not supported');
  }
}

export function logPageLoad(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (perfData) {
      console.group('Page Load Performance');
      console.log('DNS:', perfData.domainLookupEnd - perfData.domainLookupStart, 'ms');
      console.log('TCP:', perfData.connectEnd - perfData.connectStart, 'ms');
      console.log('Request:', perfData.responseStart - perfData.requestStart, 'ms');
      console.log('Response:', perfData.responseEnd - perfData.responseStart, 'ms');
      console.log('DOM Processing:', perfData.domComplete - perfData.domLoading, 'ms');
      console.log('Total:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
      console.groupEnd();
    }
  });
}
