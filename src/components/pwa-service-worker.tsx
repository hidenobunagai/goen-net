"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

export function PWAServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      return;
    }

    const register = async () => {
      try {
        // Unregister all existing service workers first
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        );

        // Clear all caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );

        // Register new service worker
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_URL + "?v=" + Date.now(), // Cache busting
          {
            scope: "/",
            updateViaCache: "none",
          }
        );

        // Force immediate activation
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker available, reload the page
                window.location.reload();
              }
            });
          }
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to register service worker", error);
        }
      }
    };

    register();
  }, []);

  return null;
}
