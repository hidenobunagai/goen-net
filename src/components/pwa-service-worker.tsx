"use client";

import { useEffect, useRef } from "react";

const SERVICE_WORKER_URL = "/sw.js";

export function PWAServiceWorker() {
  const registeredRef = useRef(false);

  useEffect(() => {
    // Prevent multiple registrations
    if (registeredRef.current) {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Disable in development to avoid reload loops
    if (process.env.NODE_ENV === "development") {
      return;
    }

    const register = async () => {
      try {
        // Check if already registered with current version
        const existingRegistration = await navigator.serviceWorker.getRegistration("/");
        if (existingRegistration?.active) {
          // Already registered, no need to re-register
          registeredRef.current = true;
          return;
        }

        // Register service worker (only if not already registered)
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_URL,
          {
            scope: "/",
            updateViaCache: "none",
          }
        );

        registeredRef.current = true;

        // Handle updates (but don't auto-reload to prevent loops)
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New version available, but don't auto-reload
                // User can manually refresh if needed
                console.log("New service worker available. Refresh to update.");
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
