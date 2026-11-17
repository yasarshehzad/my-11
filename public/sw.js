const CACHE_VERSION = 'my11-v2026-11-17';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const CORE_SHELL_URLS = [
  '/',
  '/draft/',
  '/career/',
  '/career/play/',
  '/career/setup/',
  '/manifest.json',
  '/icon.png',
  '/data/supplemental-2026-27.json',
  '/data/supplemental-archive.json',
  '/data/player-bio-records.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          CORE_SHELL_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([STATIC_CACHE, DATA_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('my11-') && !allowedCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept sw.js itself
  if (url.pathname === '/sw.js') return;

  // Navigation / HTML pages: Network-first with cache fallback for offline support
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/');
          return rootCached || Response.error();
        })
    );
    return;
  }

  // Static DB JSON payloads under /data/: Stale-while-revalidate with valid offline Response
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => undefined);

        if (cached) {
          void networkFetch;
          return cached;
        }
        const netRes = await networkFetch;
        return (
          netRes ||
          new Response(JSON.stringify({ error: 'Offline and uncached' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      })
    );
    return;
  }

  // Immutable Next.js build chunks & images: Cache-first with safe offline fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/icon.png' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return Response.error();
        }
      })
    );
  }
});
