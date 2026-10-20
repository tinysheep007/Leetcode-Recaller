/* Generated during npm run build. Do not edit public/sw.js directly. */
const CACHE = 'recall-app-__CACHE_VERSION__';
const ASSETS = __PRECACHE_ASSETS__;
self.addEventListener('install', event => {
  // Installation only succeeds if the whole app shell is cached.
  // Do not skipWaiting: an existing session keeps a consistent version.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('recall-app-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Only the current single-page app and its immutable build assets are cached.
  // Email endpoints and other future APIs must continue to use the network.
  if (request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match('/')) || fetch(request)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(request)));
  }
});
