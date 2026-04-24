const CACHE_NAME = 'hitster-v4';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './style.css',
    './manifest.json',
    './data/hitster-de-aaaa0007.csv',
    './data/hitster-de-aaaa0012.csv',
    './data/hitster-de-aaaa0015.csv',
    './data/hitster-de-aaaa0019.csv',
    './data/hitster-de-aaaa0025.csv',
    './data/hitster-de-aaaa0026.csv',
    './data/hitster-de-aaaa0039.csv',
    './data/hitster-de-aaaa0040.csv',
    './data/hitster-de-aaaa0042.csv',
    './data/hitster-de.csv',
    './data/hitster-fr-aaaa0031.csv',
    './data/hitster-fr.csv',
    './data/hitster-nl.csv',
    './data/hitster-nordics.csv',
    './data/hitster-pl-aaae0001.csv',
    './data/hitster-hu-aaae0003.csv',
    './data/hitster-ca-aaad0001.csv'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Don't cache Spotify API calls
    if (url.includes('spotify.com') || url.includes('scdn.co')) {
        return;
    }

    // Don't cache version check requests (app.js with timestamp)
    if (url.includes('app.js?t=')) {
        return;
    }

    // Network-first for HTML, JS, CSS, manifest - so updates propagate
    const isAppResource = url.endsWith('/') ||
        url.endsWith('.html') ||
        url.endsWith('.js') ||
        url.endsWith('.css') ||
        url.endsWith('manifest.json');

    if (isAppResource) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Update cache with fresh copy
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for everything else (CSV data, images)
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request))
    );
});
