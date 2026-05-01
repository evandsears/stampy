self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A simple fetch listener is required by some browsers to be installable
self.addEventListener('fetch', (event) => {
  // Let the browser do its default thing
  // In a real PWA you'd cache assets here
  event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
});
