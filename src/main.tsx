import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/service-worker-registration';
import { logger } from './lib/logger';
import { errorMonitor } from './lib/monitoring/error-monitor';
import { performanceMonitor } from './lib/monitoring/performance-monitor';

(function silenceStackblitzNoise() {
  const isStackBlitz =
    location.hostname.includes('stackblitz.com') ||
    location.hostname.includes('webcontainer') ||
    location.hostname.includes('staticblitz');

  if (!isStackBlitz) return;

  // Liste des URLs à filtrer silencieusement
  const shouldMute = (url: string | undefined) =>
    !!url &&
    (url.includes('stackblitz.com/api/ad_conversions') ||
     url.includes('/api/ad_conversions') ||
     url.includes('/api/dns-records'));

  // Intercepter fetch
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (shouldMute(url)) {
      // Retourner une réponse vide silencieusement
      return Promise.resolve(new Response('{}', {
        status: 204,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    return origFetch(input, init);
  };

  // Intercepter sendBeacon
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit) => {
      if (shouldMute(typeof url === 'string' ? url : url.toString())) return true;
      return origBeacon(url, data);
    };
  }

  // Supprimer les erreurs de console spécifiques
  const origError = console.error;
  console.error = function(...args: any[]) {
    const msg = args.join(' ');
    if (
      msg.includes('ad_conversions') ||
      msg.includes('ad conversion') ||
      msg.includes('DNS records') ||
      msg.includes('Tracking has already been taken')
    ) {
      return; // Ignore silencieusement
    }
    return origError.apply(console, args);
  };

  // Supprimer les warnings spécifiques
  const origWarn = console.warn;
  console.warn = function(...args: any[]) {
    const msg = args.join(' ');
    if (
      msg.includes('[Contextify]') ||
      msg.includes('preloaded using link preload')
    ) {
      return; // Ignore silencieusement
    }
    return origWarn.apply(console, args);
  };
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
