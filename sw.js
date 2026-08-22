const CACHE_NAME = 'recomp-10-v55-local-checkins';
const APP_SHELL = [
  './',
  './index.html',
  './privacy.html',
  './support.html',
  './persistence.js',
  './date-engine.js',
  './training-engine.js',
  './nutrition-engine.js',
  './meal-planner.js',
  './meal-planner-ui.js',
  './meal-planner-six-v52.js',
  './quality-v53.js',
  './meal-planner-profile-sync-v52.js',
  './coach-engine.js',
  './photo-engine.js',
  './recomp-profile-v2.js',
  './recomp-intake-v2.js',
  './nutrition-target-sync-v51.js',
  './recomp-review-v3.js',
  './recomp-trend-v3.js',
  './recomp-trend-ui-v3.js',
  './recomp-checkin-v4.js',
  './checkin-local-v55.js',
  './nutrition-menu-experience-v51.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  if (event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
