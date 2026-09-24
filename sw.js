const CACHE_NAME = 'study-pro-offline-v2';

// Only cache the guaranteed local files upfront
const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(LOCAL_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Dynamically cache external links (Tailwind, PDF.js, Fonts) as they are requested
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached version if we have it
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // Otherwise, fetch from network, cache it for next time, and return it
            return fetch(event.request).then((networkResponse) => {
                // Don't cache bad responses, but DO cache opaque (CDN) responses
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                    return networkResponse;
                }
                
                let responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Only cache HTTP/HTTPS requests (ignores browser extensions/file protocols)
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseToCache);
                    }
                });
                
                return networkResponse;
            }).catch(() => {
                // Failsafe for when offline and file isn't in cache
                return new Response('', { status: 408, statusText: 'Request timed out.' });
            });
        })
    );
});
