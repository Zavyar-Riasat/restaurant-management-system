const CACHE_NAME = 'restopos-cache-v2';
const OFFLINE_URL = '/offline.html';
const APP_SHELL_ROUTES = [
  '/',
  '/dashboard',
  '/pos',
  '/orders',
  '/customers',
  '/categories',
  '/sub-categories',
  '/menu-items',
  '/deals',
  '/settings',
  OFFLINE_URL,
];

function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/static/') || pathname.startsWith('/icons/') || pathname.includes('.');
}

function shouldSkipRequest(requestUrl) {
  if (!requestUrl.startsWith(self.location.origin)) return true;
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ROUTES).catch((err) => console.warn('Cache add failed', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET') return;
  if (shouldSkipRequest(request.url)) return;
  if (requestUrl.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cachedPage) => {
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            const shell = await caches.match('/pos');
            const offline = await caches.match(OFFLINE_URL);
            return shell || offline || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
          });

        return cachedPage || networkFetch;
      })
    );
    return;
  }

  if (isStaticAsset(requestUrl.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
            return networkResponse;
          })
          .catch(() => caches.match('/'));
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match('/pos') || caches.match(OFFLINE_URL);
      })
  );
});
