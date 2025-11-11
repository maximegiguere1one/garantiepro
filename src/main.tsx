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

  // Liste des URLs à filtrer silencieusement (même en production pour Bolt.new)
  const shouldMute = (url: string | undefined) =>
    !!url &&
    (url.includes('stackblitz.com/api/ad_conversions') ||
     url.includes('/api/ad_conversions') ||
     url.includes('/api/dns-records') ||
     url.includes('bolt.new/api/analytics')); // Block Bolt.new analytics

  if (!isStackBlitz && !shouldMute(location.href)) return;

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

    // Toujours afficher les erreurs Auth/Supabase importantes
    if (
      msg.includes('[AuthContext]') ||
      msg.includes('Sign in error') ||
      msg.includes('auth/') ||
      msg.includes('AuthApiError')
    ) {
      return origError.apply(console, args);
    }

    // Filtrer seulement le bruit StackBlitz
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

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const errorMessage = error?.message || String(error);

  // Silently ignore Bolt.new analytics and StackBlitz noise
  if (
    errorMessage.includes('bolt.new/api/analytics') ||
    errorMessage.includes('ad_conversions') ||
    errorMessage.includes('Failed to fetch') && errorMessage.includes('bolt.new')
  ) {
    event.preventDefault(); // Prevent console error
    return;
  }

  // Log other unhandled rejections
  logger.error('Unhandled promise rejection:', error);
});

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

// DÉSACTIVÉ TEMPORAIREMENT: Le processeur d'email cause des erreurs CORS répétées
// tant que le domaine n'est pas configuré dans Supabase Dashboard.
// Pour réactiver: Configurez www.garantieproremorque.com dans Supabase Dashboard > Settings > API > URL Configuration
if (!import.meta.env.DEV) {
  logger.info('Production mode: Background email processor DISABLED (waiting for CORS configuration)');
  logger.info('To enable: Configure www.garantieproremorque.com in Supabase Dashboard');

  // Décommentez ces lignes après avoir configuré CORS dans Supabase:
  // import('./lib/email-queue').then(({ startEmailQueueProcessor }) => {
  //   startEmailQueueProcessor();
  // }).catch(err => {
  //   logger.error('Failed to start email queue processor:', err);
  // });
} else {
  logger.info('Development mode: Background processes disabled for performance');
}

createRoot(document.getElementById('root')!).render(<App />);
