/* Curran's Shot Reader — service worker.
   STRATEGY: NETWORK-FIRST for everything. The live site is always the truth
   (version stamps keep working exactly as before); the cache is only the
   OFFLINE fallback. Successful same-origin GETs are cached as they happen,
   so after one online session the app shell AND the AI model work offline. */
const CACHE = 'shotreader-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      // cache good same-origin responses for offline use
      try {
        const url = new URL(e.request.url);
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
      } catch (_) {}
      return res;
    }).catch(() =>
      caches.match(e.request).then(hit =>
        hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
      )
    )
  );
});
