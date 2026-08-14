const CACHE_NAME = 'restopos-cache-v1';
const OFFLINE_URL = '/offline.html';
const urlsToCache = [
  '/',
  OFFLINE_URL,
  '/dashboard',
  '/pos',
  '/orders',
  '/customers',
  '/categories',
  '/menu-items',
  '/settings'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => console.warn('Cache add failed', err));
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

  // Only intercept GET requests and same-origin resources
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.url.includes('/api/')) return;

  // Navigation requests should not fail when offline; fallback to home page if needed
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL).then((cachedResponse) => {
          return cachedResponse || caches.match('/').then((homeResponse) => homeResponse || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }));
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/');
        });
    })
  );
});
