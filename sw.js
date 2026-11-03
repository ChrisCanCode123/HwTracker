// Version 10: Fixed Offline PWA & Redirects
const CACHE_NAME = 'pdf-v10'; 

const PRECACHE_LOCAL = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './indices/book_maths-red.js',
    './indices/book_maths-blue.js'
];

// Use the direct versioned Tailwind URL to avoid 302 redirect caching bugs
const PRECACHE_CDN = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
    'https://cdn.tailwindcss.com/3.4.16',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // 1. Wait for local files to actually finish caching
            await Promise.allSettled(
                PRECACHE_LOCAL.map(url => cache.add(url).catch(err => console.warn('Local Precache failed:', url)))
            );
            
            // 2. Cache CDNs
            await Promise.allSettled(
                PRECACHE_CDN.map(url => 
                    fetch(new Request(url, { mode: 'cors' }))
                    .then(res => {
                        if (res.ok) return cache.put(url, res);
                    }).catch(err => console.warn('CDN Precache skipped:', url))
                )
            );
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
    if (url.origin !== self.location.origin) {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true, ignoreVary: true }).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                }).catch(() => new Response('', { status: 408, statusText: 'Offline' }));
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
            }).catch(() => null);

            return cachedResponse || fetchPromise.then(res => {
                // Fallback to index.html if navigating offline
                if (!res && event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return res || new Response('', { status: 408, statusText: 'Offline' });
            });
        })
    );
});