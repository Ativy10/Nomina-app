const CACHE_NAME = 'jornada-v3.2.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/storage.js',
  './js/holidays.js',
  './js/payroll.js',
  './js/ui.js',
  './assets/icons/home-mobile-ui-svgrepo-com.svg',
  './assets/icons/setting-svgrepo-com.svg',
  './assets/icons/calendar-svgrepo-com.svg',
  './assets/icons/report-svgrepo-com.svg',
  './assets/icons/tools-hammer-svgrepo-com.svg',
  './assets/paw/icon-192.png',
  './assets/paw/icon-512.png'
];

// Instalación: Precarga todos los archivos estáticos requeridos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activación: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Estrategia Stale-While-Revalidate / Cache First con respuesta sintética para Offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Servir desde caché y actualizar en segundo plano si existe
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone()); // Usar .clone() evita consumir el stream
            });
          }
        }).catch(() => {
          // Ignorar excepciones en segundo plano cuando no hay red
        });
        
        return cachedResponse;
      }

      // 2. Si el recurso no estaba en caché, buscarlo en red
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // 3. Manejo limpio de ausencias de red (evita Response.error())
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        
        return new Response('', {
          status: 404,
          statusText: 'Offline'
        });
      });
    })
  );
});

//self.addEventListener('message', (event) => {
//    if (event.data === 'SKIP_WAITING') {
//        self.skipWaiting();
//    }
//});
