// --- CONFIG --------------------------------------------------

const CACHE_NAME = "notebook-cache-v1";

// --- INSTALL -------------------------------------------------

self.addEventListener("install", (event) => {
  // We skip waiting zodat nieuwe versies meteen actief zijn
  self.skipWaiting();
});

// --- ACTIVATE -------------------------------------------------

self.addEventListener("activate", (event) => {
  // Oude caches opschonen
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// --- FETCH HANDLER --------------------------------------------

// Strategie: Network-first → Cache fallback → Cache on demand
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Alleen GET requests cachen
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Geldige response → clone opslaan in cache
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy);
        });
        return response;
      })
      .catch(() =>
        // Als netwerk faalt → callback naar cache
        caches.match(request).then((cached) => {
          if (cached) return cached;

          // SPA fallback → altijd index.html leveren
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }

          return new Response("Offline", { status: 503 });
        })
      )
  );
});