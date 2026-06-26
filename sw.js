// ArenaOS Service Worker — cache-first + background revalidate
// Bump version here when deploying updates → old caches are cleared
const CACHE = 'arenaos-v2';
const SHELL  = ['./index.html', './'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // Remove old cache versions
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Only handle same-origin requests
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Stale-while-revalidate: return cache immediately, update in background
      const networkFetch = fetch(e.request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});
