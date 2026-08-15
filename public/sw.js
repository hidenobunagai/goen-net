const CACHE_NAME = "goen-net-v2";
const STATIC_ASSETS = ["/favicon.ico", "/app-icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API Requests: Network First, fall back to Cache
  if (url.pathname.startsWith("/api/")) {
    // 認証クッキーをキャッシュキーに含め、オフライン時に別ユーザーのデータを返さないようにする
    const cookie = event.request.headers.get("cookie") ?? "";
    const cacheKey = `${event.request.url}?__user=${encodeURIComponent(cookie)}`;
    const cacheRequest = new Request(cacheKey);
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(cacheRequest, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(cacheRequest);
        })
    );
    return;
  }

  // Static Assets (Next.js builds, images): Stale While Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Navigation Requests: Network First
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Default: Network Only
  event.respondWith(fetch(event.request));
});
