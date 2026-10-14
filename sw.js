// Version 7: Pre-Cache + Safe Stale-While-Revalidate
const CACHE_NAME = 'chris-pdf-v7'; 

// 1. Files we GUARANTEE are downloaded and saved the second the app installs
const PRECACHE_URLS = [
    './',
    './index.html',
    './splash.png',
    './manifest.json',
    './icon.png',
    // Force the cache to hold your index files permanently
    './indices/book_maths-red.js',
    './indices/book_maths-blue.js',
    // Force the cache to hold the PDF engine so it never hangs
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
    'https://cdn.tailwindcss.com'
];

// 2. Install & Download Pre-Cache
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Download everything in the list. 
            // We use Promise.allSettled so if one file typos, it doesn't kill the whole app.
            return Promise.allSettled(
                PRECACHE_URLS.map(url => fetch(url).then(res => cache.put(url, res)))
            );
        })
    );
});

// 3. Activate & Clean Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Purging old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 4. Safe SWR Fetch Engine
self.addEventListener('fetch', (event) => {
    // ONLY intercept standard GET requests (ignores POSTs, extensions, etc.)
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    // NEVER intercept range requests (PDFs use these if streamed from the web)
    if (event.request.headers.get('range')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            
            // The background update task
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Only save valid responses (status 200, or 0 for opaque CDNs)
                // This prevents the SW from accidentally caching a 404 error page
                if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch((err) => {
                // Offline. Do nothing, rely on cache.
            });

            // Return the instant cache if we have it, otherwise wait for the network
            return cachedResponse || fetchPromise;
        })
    );
});