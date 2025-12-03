// --- CONFIG --------------------------------------------------

const CACHE_NAME = "notebook-cache-v1";

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
});

// --- FETCH HANDLER --------------------------------------------

// Strategie: Network-first → Cache fallback → Cache on demand
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // -------------------------------------------------------
  // 1) Speciale handling voor /diagram/*
  // -------------------------------------------------------
  if (url.pathname.startsWith("/diagram/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Cache-first return
          return cached;
        }

        // Cache miss → ophalen en opslaan
        return fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => new Response("Offline", { status: 503 }));
      })
    );
    return; // Stop hier! Val niet terug in algemene strategie
  }

  // -------------------------------------------------------
  // 2) Normale strategie (network-first)
  // -------------------------------------------------------
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        })
      )
  );
});