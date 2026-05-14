// SUB/WAVE service worker — minimal, hand-rolled. Goals:
//   1. Make the app installable (PWA install criteria require an active SW).
//   2. Keep the app shell responsive when the network blips, so the lock-screen
//      controls and "scanning the dial" state survive a flaky connection.
// Non-goals:
//   • Offline playback. The live Icecast stream and the controller API are
//     pass-through (network-only). Caching either would either serve stale
//     audio chunks or stale "now playing" state — both worse than failing.
//
// Cache strategy:
//   • /stream.mp3, /api/*  → bypass entirely (do not even respondWith).
//   • POST / non-GET       → bypass.
//   • Cross-origin         → bypass (Next image/font CDNs can self-cache).
//   • Same-origin GET HTML / static asset → stale-while-revalidate.
//
// Bump CACHE to invalidate after a deploy that changes shell HTML semantics;
// hashed `_next/static/*` assets are immutable so versioning isn't needed for
// them, but bumping is the simplest way to evict the HTML shell.

const CACHE = 'subwave-shell-v1';

self.addEventListener('install', (event) => {
  // Take over straight away so a freshly-deployed shell isn't stuck behind
  // the previous worker for a whole tab lifetime.
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/stream.mp3') return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      // Only cache successful basic responses; opaque/error responses would
      // poison the cache.
      if (res && res.ok && res.type === 'basic') {
        cache.put(request, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}
