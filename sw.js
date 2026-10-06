const CACHE_NAME = 'chris-pdf-v4';

// We must explicitly list every external file to guarantee offline survival
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Force download all assets immediately. If CORS fails, fallback to opaque (no-cors) caching.
            return Promise.all(
                CORE_ASSETS.map(url => {
                    return fetch(new Request(url, { mode: 'cors', credentials: 'omit' }))
                        .then(response => {
                            if (!response.ok) throw new Error('Network not ok');
                            return cache.put(url, response);
                        })
                        .catch(err => {
                            return fetch(new Request(url, { mode: 'no-cors' }))
                                .then(res => cache.put(url, res))
                                .catch(e => console.log('Critical cache failed:', url));
                        });
                })
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    self.clients.claim();
    // Instantly delete old v1/v2 caches to force the phone to use v3
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    // Check cache first, then fall back to network
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse; // Instant load from offline cache
            
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
                    return networkResponse;
                }
                
                // Dynamic caching for any future files we didn't explicitly list
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                
                return networkResponse;
            }).catch(() => {
                console.log('Offline: Resource missing from cache ->', event.request.url);
            });
        })
    );
});
