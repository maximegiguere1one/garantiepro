import { useEffect, useCallback, useRef } from 'react';
import { performanceMonitor, markPerformance, measurePerformance } from '../lib/performance/performance-monitor';

export function usePerformanceTracking(componentName: string) {
  const mountTime = useRef<number>(0);

  useEffect(() => {
    const mountMark = `${componentName}-mount`;
    markPerformance(mountMark);
    mountTime.current = performance.now();

    return () => {
      const unmountMark = `${componentName}-unmount`;
      markPerformance(unmountMark);
      measurePerformance(`${componentName}-lifetime`, mountMark, unmountMark);
    };
  }, [componentName]);

  const measureRender = useCallback(
    (renderName = 'render') => {
      const renderTime = performance.now() - mountTime.current;
      performanceMonitor.recordMetric(`${componentName}-${renderName}`, renderTime);

      if (renderTime > 16) {
        console.warn(
          `⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms (target: 16ms)`
        );
      }
    },
    [componentName]
  );

  return { measureRender };
}

export function useAsyncPerformance() {
  const measureAsync = useCallback(
    async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
      return performanceMonitor.measureAsync(name, fn);
    },
    []
  );

  return { measureAsync };
}

export function useFunctionPerformance() {
  const measureFunction = useCallback(<T,>(name: string, fn: () => T): T => {
    return performanceMonitor.measureFunction(name, fn);
  }, []);

  return { measureFunction };
}

interface PerformanceMark {
  start: (label?: string) => void;
  end: (label?: string) => number;
}

export function usePerformanceMark(prefix: string): PerformanceMark {
  const marks = useRef<Map<string, number>>(new Map());

  const start = useCallback(
    (label = 'default') => {
      const key = `${prefix}-${label}`;
      marks.current.set(key, performance.now());
      markPerformance(key);
    },
    [prefix]
  );

  const end = useCallback(
    (label = 'default') => {
      const key = `${prefix}-${label}`;
      const startTime = marks.current.get(key);

      if (!startTime) {
        console.warn(`No start mark found for ${key}`);
        return 0;
      }

      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(key, duration);
      marks.current.delete(key);

      return duration;
    },
    [prefix]
  );

  return { start, end };
}
