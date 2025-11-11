const CACHE_NAME = 'warranty-app-v3';
const RUNTIME_CACHE = 'warranty-runtime-v3';
const IMAGE_CACHE = 'warranty-images-v2';
const MAX_CACHE_AGE = 30 * 24 * 60 * 60 * 1000;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const CACHE_STRATEGIES = {
  cacheFirst: 'cache-first',
  networkFirst: 'network-first',
  networkOnly: 'network-only',
  cacheOnly: 'cache-only',
};

const ROUTE_STRATEGIES = {
  '/': CACHE_STRATEGIES.networkFirst,
  '/api/': CACHE_STRATEGIES.networkFirst,
  '/assets/': CACHE_STRATEGIES.cacheFirst,
  '/static/': CACHE_STRATEGIES.cacheFirst,
};

const isImageRequest = (request) => {
  return request.destination === 'image' ||
         /\.(jpg|jpeg|png|gif|svg|webp|avif)$/i.test(new URL(request.url).pathname);
};

const isCSSOrJS = (request) => {
  return /\.(css|js)$/i.test(new URL(request.url).pathname);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.error('[Service Worker] Cache install failed:', err);
      });
    })
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE && cacheName !== IMAGE_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      cleanupOldCacheEntries()
    ]).catch(err => {
      console.error('[Service Worker] Activation error:', err);
    })
  );

  self.clients.claim();
});

async function cleanupOldCacheEntries() {
  const cache = await caches.open(RUNTIME_CACHE);
  const requests = await cache.keys();
  const now = Date.now();

  return Promise.all(
    requests.map(async (request) => {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const cacheTime = new Date(dateHeader).getTime();
          if (now - cacheTime > MAX_CACHE_AGE) {
            return cache.delete(request);
          }
        }
      }
    })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Wrap everything in respondWith to handle all requests properly
  event.respondWith((async () => {
    try {
      const url = new URL(request.url);

      // CRITICAL: Block Bolt.new analytics calls that don't exist in production
      if (url.hostname === 'bolt.new' && url.pathname.includes('/api/analytics')) {
        console.log('[Service Worker] Blocking Bolt.new analytics:', request.url);
        return new Response(JSON.stringify({ success: true, blocked: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // CRITICAL: Bypass all Supabase requests - return fetch directly without caching
      // This prevents auth/v1/token and rest/v1/* from being intercepted
      if (url.hostname.endsWith('.supabase.co') || url.href.includes('supabase.co')) {
        console.log('[Service Worker] Bypassing Supabase request:', request.url);
        return fetch(request);
      }

      // Bypass non-GET requests (POST, PUT, DELETE, etc.)
      if (request.method !== 'GET') {
        return fetch(request);
      }

      // Bypass cross-origin requests (not from our domain)
      if (url.origin !== location.origin) {
        return fetch(request);
      }

      // Handle image requests with image cache
      if (isImageRequest(request)) {
        return handleImageRequest(request);
      }

      // Handle CSS/JS with cache-first strategy
      if (isCSSOrJS(request)) {
        return cacheFirst(request);
      }

      // Determine strategy for other requests
      const strategy = getStrategyForRoute(url.pathname);

      switch (strategy) {
        case CACHE_STRATEGIES.cacheFirst:
          return cacheFirst(request);
        case CACHE_STRATEGIES.networkFirst:
          return networkFirst(request);
        case CACHE_STRATEGIES.networkOnly:
          return fetch(request);
        case CACHE_STRATEGIES.cacheOnly:
          return caches.match(request);
        default:
          return networkFirst(request);
      }
    } catch (error) {
      // On any error, try to fetch directly as fallback
      console.error('[Service Worker] Fetch handler error:', error);
      try {
        return fetch(request);
      } catch (fetchError) {
        return new Response('Service Worker Error', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      }
    }
  })());
});


async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Image not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

function getStrategyForRoute(pathname) {
  for (const [route, strategy] of Object.entries(ROUTE_STRATEGIES)) {
    if (pathname.startsWith(route)) {
      return strategy;
    }
  }
  return CACHE_STRATEGIES.networkFirst;
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received');

  let data = {
    title: 'Nouvelle notification',
    body: 'Vous avez reçu une mise à jour',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'default',
    data: {},
    requireInteraction: false,
    actions: []
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Push payload parsed:', payload);
      data = { ...data, ...payload };
    } catch (e) {
      console.warn('[Service Worker] Could not parse JSON, trying text:', e);
      try {
        const text = event.data.text();
        console.log('[Service Worker] Push text:', text);
        data.body = text;
      } catch (textError) {
        console.error('[Service Worker] Error parsing push data:', textError);
      }
    }
  } else {
    console.warn('[Service Worker] No push data received');
  }

  const options = {
    body: data.body,
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    actions: data.actions || [],
    timestamp: Date.now(),
  };

  console.log('[Service Worker] Showing notification with options:', options);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[Service Worker] Notification shown successfully');
      })
      .catch(err => {
        console.error('[Service Worker] Error showing notification:', err);
        return self.registration.showNotification('Notification', {
          body: 'Une nouvelle notification est disponible',
          icon: '/vite.svg',
        });
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const actionClicked = event.action;

  console.log('[Service Worker] Opening URL:', urlToOpen, 'Action:', actionClicked);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('[Service Worker] Found', clientList.length, 'open clients');

        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);

          if (clientUrl.href === targetUrl.href && 'focus' in client) {
            console.log('[Service Worker] Focusing existing client');
            return client.focus();
          }
        }

        if (clients.openWindow) {
          console.log('[Service Worker] Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Error handling notification click:', error);
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_OFFLINE_QUEUE',
      });
    });
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}
