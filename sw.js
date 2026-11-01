// Version 13: Opaque CDN Support (Fixes White Screen CSS Crash)
const CACHE_NAME = 'Cache-v3'; 

const PRECACHE_LOCAL = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './indices/book_maths-red.js',
    './indices/book_maths-blue.js',
    './indices/physics.js'
];

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
            const localPromises = PRECACHE_LOCAL.map(url => 
                fetch(url).then(res => {
                    if (res.ok) cache.put(url, res);
                }).catch(err => console.log('Skipped local file:', url))
            );

            const cdnPromises = PRECACHE_CDN.map(url => 
                // Allow "no-cors" so Tailwind and Fonts don't get blocked
                fetch(new Request(url, { mode: 'no-cors' }))
                .then(res => {
                    // Force the cache to accept opaque (status 0) responses
                    if (res.ok || res.type === 'opaque' || res.status === 0) cache.put(url, res);
                }).catch(err => console.log('Skipped CDN file:', url))
            );

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

    if (url.origin !== location.origin) {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true, ignoreVary: true }).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                
                return fetch(event.request).then((networkResponse) => {
                    // Accept status 0 here as well for background CSS updates
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0 || networkResponse.type === 'opaque')) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                }).catch(() => { /* Offline */ });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => { /* Offline */ });

            return cachedResponse || fetchPromise.then(res => {
                if (!res) throw new Error("Offline and file not cached");
                return res;
            });
        })
    );
});