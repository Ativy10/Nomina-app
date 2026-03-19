const CACHE = "nomina-cache-v2";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        "/nomina-app/",
        "/nomina-app/index.html",
        "/nomina-app/manifest.json",
        "/nomina-app/icon-192.png",
        "/nomina-app/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});
