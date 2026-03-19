const CACHE_NAME = "nomina-app-v1";

// Archivos que se guardarán offline
const urlsToCache = [
  "/",
  "/Nomina_V1-2.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Instalación: guardar archivos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("📦 Cacheando archivos");
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación
self.addEventListener("activate", event => {
  console.log("✅ Service Worker activado");
});

// Interceptar peticiones
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache → usarlo
        if (response) {
          return response;
        }
        // Si no → ir a internet
        return fetch(event.request);
      })
  );
});
