const CACHE_NAME = 'study-pro-offline-v1';

// These are the files and external links the app needs to run without internet
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install step: Download everything into the offline cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Fetch step: Whenever the app asks for a file, check the offline cache first
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return the cached offline version if we have it, otherwise try the internet
            return cachedResponse || fetch(event.request);
        }).catch(() => {
            // Failsafe: if offline and not in cache, do nothing to prevent crashing
            return new Response();
        })
    );
});