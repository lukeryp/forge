// FORGE service worker — privacy-safe offline shell.
//
// Design:
//   • Only PUBLIC routes and static assets are cacheable. Authenticated
//     routes (/, /history, /sessions/*) are never stored in cache — on a
//     shared device this prevents the previous user's dashboard HTML from
//     surfacing for the next user.
//   • Navigations: network-first. On failure we serve /offline (shell page)
//     rather than the last-seen homepage.
//   • API + Supabase + auth endpoints: passthrough, never cached.
//   • Client can request a full cache purge via postMessage({type: 'PURGE_CACHE'}).

const VERSION       = 'forge-v2';
const SHELL_CACHE   = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  '/offline',
  '/login',
  '/signup',
  '/manifest.webmanifest',
  '/ryp-wordmark.svg',
  '/ryp-app-icon.svg',
  '/ball-flight-arc.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-icon.png',
];

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/offline']);

function isPublicNavigation(pathname) {
  return PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/auth/');
}

function isStaticAsset(url) {
  if (url.pathname.startsWith('/_next/static/')) return true;
  if (url.pathname === '/manifest.webmanifest') return true;
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|css|js|map)$/.test(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch((err) => {
        // Don't fail install — log so Vercel/Sentry can see broken shell asset
        console.error('[forge-sw] shell addAll failed:', err);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PURGE_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin only. Supabase + any 3rd-party goes to network directly.
  if (url.origin !== self.location.origin) return;

  // API + auth routes: never cache, never intercept.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // HTML navigations
  if (req.mode === 'navigate') {
    // Authenticated routes: network-only. On failure, go to /offline shell.
    if (!isPublicNavigation(url.pathname)) {
      event.respondWith(
        fetch(req).catch(() =>
          caches.match('/offline').then((r) => r || new Response('', { status: 503 }))
        )
      );
      return;
    }

    // Public routes: network-first, fall back to shell cache.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('/offline') || new Response('', { status: 503 }))
        )
    );
    return;
  }

  // Static assets: cache-first (these never contain user-specific data).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  // Everything else: let the browser handle (no cache, no SW interception)
});
