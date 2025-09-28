const CACHE_NAME = "goen-net-cache-v1";
const OFFLINE_URLS = ["/", "/manifest.webmanifest", "/app-icon.svg"]; // keep list small for now

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestURL = new URL(request.url);
  if (requestURL.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache).catch(() => {
              // Ignore cache put errors (e.g., opaque responses)
            });
          });

          return response;
        })
        .catch(async () => {
          if (request.mode === "navigate") {
            const cachedRoot = await caches.match("/");
            if (cachedRoot) {
              return cachedRoot;
            }
          }

          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});
