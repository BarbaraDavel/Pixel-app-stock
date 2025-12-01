const CACHE_NAME = "pixel-cache-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/firebase.js",
  "./js/pedidos.js",
  "./js/productos.js",
  "./js/clientes.js",
  "./js/stock.js",
  "./js/insumos.js"
];

// Instalar y guardar archivos en caché
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar y limpiar versiones viejas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Interceptar peticiones
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request);
    })
  );
});
