const CACHE_NAME = "pixel-stock-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/insumos.html",
  "/stock.html",
  "/movimientos_stock.html",
  "/recetas.html",
  "/productos.html",
  "/clientes.html",
  "/pedidos.html",
  "/css/styles.css",
  "/js/firebase.js",
  "/js/pedidos.js"
  // podés sumar más JS que uses
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // Podrías devolver una página offline custom acá si querés
          return cached;
        })
      );
    })
  );
});
