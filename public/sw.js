const CACHE_NAME = 'restopos-cache-v1';
const urlsToCache = [
  '/',
  '/pos',
  '/dashboard'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(err => console.warn('Cache add failed', err));
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  // Ignore API requests in the service worker (let Dexie handle API offline capability)
  if (event.request.url.includes('/api/')) return;

  // Stale-while-revalidate strategy for the UI
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => {
        // If network fetch fails, we just rely on what's in the cache
      });
      return cachedResponse || fetchPromise;
    })
  );
});
