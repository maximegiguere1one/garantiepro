import { lazy, ComponentType } from 'react';

interface RetryOptions {
  retries?: number;
  delay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  delay: 1000,
  timeout: 10000,
};

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Component import timeout after ${opts.timeout}ms`));
      }, opts.timeout);

      const attemptImport = async (retriesLeft: number): Promise<{ default: T }> => {
        try {
          const component = await componentImport();
          clearTimeout(timeoutId);
          return component;
        } catch (error) {
          clearTimeout(timeoutId);

          if (retriesLeft === 0) {
            console.error('Failed to load component after retries:', error);
            throw error;
          }

          console.warn(
            `Failed to load component, retrying... (${retriesLeft} attempts left)`,
            error
          );

          await new Promise((r) => setTimeout(r, opts.delay));
          return attemptImport(retriesLeft - 1);
        }
      };

      attemptImport(opts.retries)
        .then(resolve)
        .catch(reject);
    });
  });
}

export function lazyWithPreload<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  const Component = lazy(componentImport);
  (Component as any).preload = componentImport;
  return Component;
}

export function preloadComponent(Component: any) {
  if (Component && typeof Component.preload === 'function') {
    Component.preload();
  }
}
