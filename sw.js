const CACHE_NAME = 'secure-portal-v3';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'css/styles.css',
  'js/script.js',
  'js/upload.js',
  'favicon/favicon.ico',
  'favicon/favicon-16x16.png',
  'favicon/favicon-32x32.png',
  'favicon/apple-touch-icon.png',
  'favicon/android-chrome-192x192.png',
  'favicon/android-chrome-512x512.png',
  'favicon/site.webmanifest',
  'images/cloud.png',
  'images/mountain.png',
  'images/time table.png',
  'images/timetable.png'
];

// Install Event - Pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[Service Worker] Network fetch failed, using cache:', err);
          return cachedResponse;
        });

        // Return cached response immediately if available
        return cachedResponse || fetchPromise;
      });
    })
  );
});
