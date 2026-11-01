// Version 12: Fault-Tolerant Installer & Bulletproof Offline PDF Worker
const CACHE_NAME = 'Cache-v2'; 

// 1. Local files we need instantly (Stale-While-Revalidate)
const PRECACHE_LOCAL = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './indices/book_maths-red.js',
    './indices/book_maths-blue.js',
    './indices/physics.js'
];

// 2. External libraries (Strict Cache-First + CORS enforcement)
const PRECACHE_CDN = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            
            // Safely cache local files (ignores 404s without crashing the whole install)
            const localPromises = PRECACHE_LOCAL.map(url => 
                fetch(url).then(res => {
                    if (res.ok) cache.put(url, res);
                }).catch(err => console.log('Skipped local file:', url))
            );

            // Safely cache external CDNs with strict CORS enforcement
            const cdnPromises = PRECACHE_CDN.map(url => 
                fetch(new Request(url, { mode: 'cors' }))
                .then(res => {
                    if (res.ok) cache.put(url, res);
                }).catch(err => console.log('Skipped CDN file:', url))
            );

            // Execute all downloads independently
            return Promise.allSettled([...localPromises, ...cdnPromises]);
        })
    );
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

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;
    if (event.request.headers.get('range')) return;

    const url = new URL(event.request.url);

    // STRATEGY A: External CDNs (Cache-First)
    if (url.origin !== location.origin) {
        event.respondWith(
            // ignoreSearch and ignoreVary guarantee we don't miss the cached file due to random URL parameters
            caches.match(event.request, { ignoreSearch: true, ignoreVary: true }).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                }).catch(() => { /* Offline, do nothing */ });
            })
        );
        return;
    }

    // STRATEGY B: Local App Files (Stale-While-Revalidate)
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => { /* Offline, fallback to cache */ });

            return cachedResponse || fetchPromise.then(res => {
                if (!res) throw new Error("Offline and file not cached");
                return res;
            });
        })
    );
});