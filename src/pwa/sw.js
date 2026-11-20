const CACHE_PREFIX = 'cendres-eclipse-';
const CACHE_NAME = CACHE_PREFIX + BUILD_VERSION;
const APP_SHELL = ['/index.html', '/manifest.webmanifest', ...BUILD_ASSETS];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function serveRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const isNavigation = request.mode === 'navigate';

  if (BUILD_ASSETS.includes(new URL(request.url).pathname)) {
    const cached = await cache.match(request);
    if (cached) return cached;
  }

  try {
    const response = await fetch(request, { cache: isNavigation ? 'no-cache' : 'default' });
    if (response.ok && response.type === 'basic') {
      const cacheKey = isNavigation ? '/index.html' : request;
      await cache.put(cacheKey, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return (await cache.match(isNavigation ? '/index.html' : request)) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  event.respondWith(serveRequest(request));
});
