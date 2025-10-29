interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  overallScore: number;
  recommendations: string[];
}

export class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('FID', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      try {
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              this.recordMetric('CLS', entry.value);
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  recordMetric(name: string, value: number) {
    const rating = this.getRating(name, value);
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      rating,
    });
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[name];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  measurePageLoad() {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as any;
    if (navigation) {
      this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart);
      this.recordMetric('DOM_LOAD', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
      this.recordMetric('WINDOW_LOAD', navigation.loadEventEnd - navigation.loadEventStart);
      this.recordMetric('TOTAL_LOAD', navigation.loadEventEnd - navigation.fetchStart);
    }

    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((entry) => entry.name === 'first-contentful-paint');
    if (fcp) {
      this.recordMetric('FCP', fcp.startTime);
    }
  }

  measureResourceTiming() {
    if (typeof window === 'undefined') return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const slowResources = resources.filter((r) => r.duration > 1000);

    slowResources.forEach((resource) => {
      this.recordMetric(`RESOURCE_${resource.initiatorType.toUpperCase()}`, resource.duration);
    });
  }

  getReport(): PerformanceReport {
    const recommendations: string[] = [];
    let totalScore = 0;
    let scoreCount = 0;

    const metricGroups = this.groupMetricsByName();

    Object.entries(metricGroups).forEach(([name, metrics]) => {
      const latestMetric = metrics[metrics.length - 1];

      if (latestMetric.rating === 'poor') {
        recommendations.push(this.getRecommendation(name, latestMetric.value));
        totalScore += 0;
      } else if (latestMetric.rating === 'needs-improvement') {
        recommendations.push(this.getRecommendation(name, latestMetric.value));
        totalScore += 50;
      } else {
        totalScore += 100;
      }
      scoreCount++;
    });

    const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    return {
      metrics: this.metrics,
      overallScore,
      recommendations,
    };
  }

  private groupMetricsByName(): Record<string, PerformanceMetric[]> {
    return this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);
  }

  private getRecommendation(name: string, value: number): string {
    const recommendations: Record<string, string> = {
      LCP: `Largest Contentful Paint is ${(value / 1000).toFixed(2)}s. Optimize images, use CDN, and implement lazy loading.`,
      FID: `First Input Delay is ${value.toFixed(0)}ms. Reduce JavaScript execution time and break up long tasks.`,
      CLS: `Cumulative Layout Shift is ${value.toFixed(3)}. Set explicit dimensions for images and avoid inserting content above existing content.`,
      FCP: `First Contentful Paint is ${(value / 1000).toFixed(2)}s. Reduce render-blocking resources and optimize critical rendering path.`,
      TTFB: `Time to First Byte is ${(value / 1000).toFixed(2)}s. Optimize server response time and consider using a CDN.`,
      TOTAL_LOAD: `Total page load time is ${(value / 1000).toFixed(2)}s. Consider code splitting and lazy loading.`,
    };

    return recommendations[name] || `${name} needs optimization (value: ${value})`;
  }

  clearMetrics() {
    this.metrics = [];
  }

  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.clearMetrics();
  }

  logMetrics() {
    const report = this.getReport();
    console.group('Performance Report');
    console.log(`Overall Score: ${report.overallScore}/100`);
    console.table(report.metrics);
    if (report.recommendations.length > 0) {
      console.group('Recommendations');
      report.recommendations.forEach((rec) => console.log(`• ${rec}`));
      console.groupEnd();
    }
    console.groupEnd();
  }
}

export const performanceTracker = new PerformanceTracker();

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceTracker.measurePageLoad();
      performanceTracker.measureResourceTiming();

      if (process.env.NODE_ENV === 'development') {
        performanceTracker.logMetrics();
      }
    }, 0);
  });
}
