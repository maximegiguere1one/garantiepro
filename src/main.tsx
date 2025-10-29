import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/service-worker-registration';
import { logger } from './lib/logger';
import { errorMonitor } from './lib/monitoring/error-monitor';
import { performanceMonitor } from './lib/monitoring/performance-monitor';

(function silenceStackblitzNoise() {
  const isBolt =
    location.hostname.includes('stackblitz.com') ||
    location.hostname.includes('webcontainer') ||
    location.hostname.includes('staticblitz');

  if (!isBolt) return;

  const shouldMute = (url: string | undefined) =>
    !!url &&
    (url.includes('stackblitz.com/api/ad_conversions') ||
     url.includes('/api/ad_conversions'));

  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (shouldMute(url)) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return origFetch(input, init);
  };

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit) => {
      if (shouldMute(typeof url === 'string' ? url : url.toString())) return true;
      return origBeacon(url, data);
    };
  }
})();

errorMonitor.initialize();
performanceMonitor.initialize();

const rootElement = document.getElementById('root');
if (rootElement) {
  const initialLoader = rootElement.querySelector('.initial-loader');
  if (initialLoader) {
    initialLoader.remove();
  }
}

registerServiceWorker();

if (!import.meta.env.DEV) {
  logger.info('Production mode: Background processes enabled');

  import('./lib/email-queue').then(({ startEmailQueueProcessor }) => {
    startEmailQueueProcessor();
  }).catch(err => {
    logger.error('Failed to start email queue processor:', err);
  });
} else {
  logger.info('Development mode: Background processes disabled for performance');
}

createRoot(document.getElementById('root')!).render(<App />);
