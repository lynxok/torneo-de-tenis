const CACHE_NAME = 'smash-tennis-v1.4.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/version.json',
  '/favicon.png',
  '/Smash.png',
  '/profile-banner.jpg',
  '/tennis-balls-banner.jpg',
  '/manifest.json'
];

// Message listener: Immediate skipWaiting when client requests update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Some static assets failed to precache', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch:
// 1. Navigation requests (HTML) & version.json -> Network-First (always freshest version when online)
// 2. Supabase API calls / non-GET -> bypass cache
// 3. Static assets -> Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not cache Supabase API calls or non-GET requests
  if (event.request.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  // version.json -> ALWAYS NETWORK ONLY with cache bypass
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match('/version.json'))
    );
    return;
  }

  // HTML / Navigation -> Network-First (crucial for mobile auto-updates)
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Other assets (images, css, js bundles) -> Cache-first with background revalidation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
