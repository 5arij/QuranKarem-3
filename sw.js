const CACHE_NAME = 'quran-radio-_Quran_Kareem_19252845';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Avoid caching the live stream URL to prevent storage bloat and playback issues
  if (event.request.url.includes('stream.radiojar.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            // Allow caching of opaque responses (status 0) for CDNs (Tailwind, Fonts)
            // Basic validation: must be defined and not an error
            if(!response || response.status === 404 || response.type === 'error') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                const url = event.request.url;
                // Cache local files OR specific trusted CDNs necessary for UI rendering
                // This ensures the app looks correct even if offline, preventing ANRs in WebViews
                if (url.startsWith(self.location.origin) || 
                    url.includes('cdn.tailwindcss.com') ||
                    url.includes('fonts.googleapis.com') ||
                    url.includes('fonts.gstatic.com') ||
                    url.includes('picsum.photos')) {
                   cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});