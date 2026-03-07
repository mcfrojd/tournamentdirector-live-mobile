// service-worker.js — VPK Live PWA
// Strategy:
//   - /td-receiver* → Network only (always live data)
//   - everything else → Cache first, fall back to network

const CACHE = 'vpk-live-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/settings.json',
  '/locales/sv.json',
  '/locales/en.json',
  '/icons/icon-96.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
];

// ── Install: pre-cache static assets ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: route requests ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Live data endpoint — always network, never cache
  if (url.pathname.startsWith('/td-receiver')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Umami analytics — network only, fail silently
  if (url.hostname.includes('umami')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 204 })));
    return;
  }

  // Google Fonts — network first, cache fallback
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // Everything else — cache first, network fallback
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      } catch {
        return new Response('Offline', { status: 503 });
      }
    })
  );
});