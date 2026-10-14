// Version 6: Stale-While-Revalidate Architecture
const CACHE_NAME = 'chris-pdf-v6'; 

// 1. Install & Activate instantly
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) return caches.delete(cache);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 2. The Ultra-Fast Fetch Engine
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // STRATEGY A: External CDNs (Tailwind, PDF.js, Google Fonts)
    // -> CACHE-FIRST. Check memory. If missing, fetch and save.
    if (url.origin !== location.origin) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((networkResponse) => {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return networkResponse;
                });
            })
        );
        return;
    }

    // STRATEGY B: Local App Files (index.html, splash.png, and your JS indices)
    // -> STALE-WHILE-REVALIDATE. Load instantly from memory, update in background.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            
            // The background update task
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return networkResponse;
            }).catch((err) => {
                console.log('User is offline. Background update paused.');
            });

            // Return the instant cache if we have it. If we don't (first visit), wait for the network.
            return cachedResponse || fetchPromise;
        })
    );
});