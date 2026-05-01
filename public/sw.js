const CACHE_NAME = 'stampy-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/android/launchericon-192x192.png'
];

// Install the service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Serve assets from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
