// Increment this version string whenever you deploy code updates
const CACHE_NAME = 'app-v5';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png'
];

// 1. Install: Safe caching that won't brick the app if a file fails
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Using addAll can fail the whole install if one file 404s. 
            // Fetching individually ensures resilient installation.
            return Promise.allSettled(
                PRECACHE_ASSETS.map(url => 
                    fetch(url).then(res => {
                        if (res.ok) return cache.put(url, res);
                    }).catch(err => console.warn('Optional asset skipped:', url))
                )
            );
        })
    );
});

// 2. Activate: Instantly clean up old caches and take control of all active clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache); // Automatically purges old client cache bloat
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch: Network-First for HTML/Dynamic content, Cache-First for static assets
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached asset immediately if available, but fetch fresh in background
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => {
                // Fallback for offline navigation if needed
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });

            return cachedResponse || fetchPromise;
        })
    );
});