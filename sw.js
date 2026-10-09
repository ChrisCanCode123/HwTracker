const CACHE_NAME = 'chris-pdf-cache-v3';

// Core assets to store permanently in cache
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './indices/book_maths-red.js',
  './indices/book_maths-blue.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
];

// 1. Install & pre-cache all critical assets once
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // cache.addAll ensures files are stored without redundant network roundtrips
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Wipe out old/deprecated caches to save space and avoid double-caching
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Cache-first for saved assets, direct pass-through for everything else
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests and unsupported protocols immediately to eliminate lag
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: false }).then((cachedResponse) => {
      if (cachedResponse) {
        // Return instantly from permanent storage (zero network lag)
        return cachedResponse;
      }

      // If not in cache, load directly from network without caching dynamically
      // This prevents double-caching against IndexedDB
      return fetch(event.request);
    })
  );
});