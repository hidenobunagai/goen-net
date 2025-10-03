// Service Worker v3 - Clear all caches and unregister

self.addEventListener("install", () => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Delete ALL caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Don't cache anything - always fetch fresh
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request, {
      cache: "no-store"
    })
  );
});
