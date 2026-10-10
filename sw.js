// Bump this version number every time you push a major update to clear old caches
const CACHE_NAME = 'chris-pdf-v5'; 

// External heavy files (We want these Cache-First because they never change)
const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
];

// 1. INSTALL: Force the new worker to install immediately and download CDNs
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CDN_ASSETS).catch(err => console.log('CDN Cache skip:', err));
        })
    );
});

// 2. ACTIVATE: Instantly delete any old caches to free up phone storage and force the update
self.addEventListener('activate', (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Deleting old cache ->', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. FETCH: Smart Routing (Network-First for your code, Cache-First for big libraries)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // STRATEGY A: External CDNs (Tailwind, PDF.js, Google Fonts)
    // Always use Cache-First to save data and load instantly.
    if (url.origin !== location.origin) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // STRATEGY B: Local App Files (index.html, your js index files)
    // Always use Network-First. Ask the internet for the newest code first.
    // If the user is completely offline, fall back to the saved cache.
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // We got the newest code! Save a copy for offline mode.
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // Network failed (offline). Serve the backup from the cache.
                return caches.match(event.request);
            })
    );
});