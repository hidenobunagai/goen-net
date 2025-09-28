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
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_URL,
          {
            scope: "/",
          }
        );

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
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
