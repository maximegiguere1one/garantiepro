export function registerServiceWorker(): void {
  // Check if we're in StackBlitz or similar environment where Service Workers are not supported
  const isStackBlitz = window.location.hostname.includes('stackblitz') ||
                       window.location.hostname.includes('webcontainer');

  if (isStackBlitz) {
    // Silencieusement skip dans StackBlitz
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[ServiceWorker] Registered successfully:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New Service Worker available. Refresh to update.');
                notifyUserOfUpdate();
              }
            });
          }
        });
      } catch (error: any) {
        console.warn('[ServiceWorker] Registration failed (this is normal in some environments):', error?.message);
      }
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_OFFLINE_QUEUE') {
        console.log('Received sync request from Service Worker');
        window.dispatchEvent(new CustomEvent('sync-offline-queue'));
      }
    });
  } else {
    console.log('[ServiceWorker] Not supported in this browser');
  }
}

export function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready
      .then((registration) => {
        return registration.unregister();
      })
      .catch((error) => {
        console.error('Error unregistering Service Worker:', error);
        return false;
      });
  }
  return Promise.resolve(false);
}

export function updateServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }
}

export function skipWaitingServiceWorker(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function clearServiceWorkerCache(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }
}

function notifyUserOfUpdate(): void {
  const updateBanner = document.createElement('div');
  updateBanner.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1e293b;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 16px;
  `;

  updateBanner.innerHTML = `
    <div>
      <div style="font-weight: 600; margin-bottom: 4px;">Mise à jour disponible</div>
      <div style="font-size: 14px; opacity: 0.9;">Une nouvelle version est disponible</div>
    </div>
    <button
      onclick="window.location.reload()"
      style="
        background: white;
        color: #1e293b;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      "
    >
      Actualiser
    </button>
  `;

  document.body.appendChild(updateBanner);

  setTimeout(() => {
    updateBanner.style.animation = 'slideInRight 0.3s ease-out';
  }, 100);
}
