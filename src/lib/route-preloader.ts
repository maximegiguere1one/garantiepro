import { ComponentType } from 'react';

interface PreloadConfig {
  component: any;
  condition?: () => boolean;
  delay?: number;
}

class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadQueue: PreloadConfig[] = [];
  private isPreloading = false;

  preloadRoute(routeName: string, config: PreloadConfig) {
    if (this.preloadedRoutes.has(routeName)) {
      return;
    }

    if (config.condition && !config.condition()) {
      return;
    }

    this.preloadQueue.push(config);
    this.preloadedRoutes.add(routeName);

    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.preloadQueue.length === 0) {
      this.isPreloading = false;
      return;
    }

    this.isPreloading = true;
    const config = this.preloadQueue.shift()!;

    if (config.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    if (typeof config.component?.preload === 'function') {
      try {
        await config.component.preload();
      } catch (error) {
        console.warn('Failed to preload component:', error);
      }
    }

    requestIdleCallback(() => this.processQueue());
  }

  preloadOnHover(element: HTMLElement, config: PreloadConfig) {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      timeoutId = setTimeout(() => {
        if (typeof config.component?.preload === 'function') {
          config.component.preload();
        }
      }, 100);
    };

    const handleMouseLeave = () => {
      clearTimeout(timeoutId);
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }

  preloadCriticalRoutes(routes: string[], configs: Record<string, PreloadConfig>) {
    routes.forEach((route) => {
      if (configs[route]) {
        this.preloadRoute(route, configs[route]);
      }
    });
  }

  reset() {
    this.preloadedRoutes.clear();
    this.preloadQueue = [];
    this.isPreloading = false;
  }
}

export const routePreloader = new RoutePreloader();

export function useRoutePreload(routeName: string, component: any, delay = 0) {
  const preload = () => {
    routePreloader.preloadRoute(routeName, {
      component,
      delay,
    });
  };

  return { preload };
}

export function preloadOnIdle(component: any, maxWait = 5000) {
  const timeoutId = setTimeout(() => {
    if (typeof component?.preload === 'function') {
      component.preload();
    }
  }, maxWait);

  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      () => {
        clearTimeout(timeoutId);
        if (typeof component?.preload === 'function') {
          component.preload();
        }
      },
      { timeout: maxWait }
    );
  }
}
