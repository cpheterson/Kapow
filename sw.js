// KAPOW! Service Worker — offline caching
const CACHE_NAME = 'kapow-v34';
const ASSETS = [
  '/Kapow/',
  '/Kapow/index.html',
  '/Kapow/css/styles.css',
  '/Kapow/js/kapow.js',
  '/Kapow/js/sound.js',
  '/Kapow/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Network succeeded — update cache and return fresh response
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
