/* Service worker: la app funciona sin conexión y se instala como aplicación. */
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`, CDN = `cdn-${VERSION}`, TILES = 'tiles-v1';
const SHELL_FILES = ['./', 'index.html', 'styles.css', 'js/data.js', 'js/engine.js', 'js/app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
const CDN_FILES = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];
const MAX_TILES = 600;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await (await caches.open(SHELL)).addAll(SHELL_FILES);
    await (await caches.open(CDN)).addAll(CDN_FILES).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [SHELL, CDN, TILES];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Teselas del mapa: primero caché (se ven las zonas ya visitadas sin conexión)
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith((async () => {
      const cache = await caches.open(TILES);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        cache.put(req, res.clone()).then(() => trim(cache));
        return res;
      } catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  // Librerías y fuentes externas: caché primero
  if (url.origin !== location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CDN);
      const hit = await cache.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }
      catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  // Archivos de la app: red primero (siempre la última versión) y caché si no hay conexión
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }
  })());
});
