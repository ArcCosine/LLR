const CACHE_NAME = 'llr-prefetch-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PREFETCH_RSS') {
    const urls = event.data.urls;
    event.waitUntil(prefetchUrls(urls));
  }
});

async function prefetchUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  for (const url of urls) {
    try {
      // Use the proxy URL to prefetch
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        await cache.put(proxyUrl, response);
        console.log(`[SW] Prefetched: ${url}`);
      }
    } catch (error) {
      console.error(`[SW] Prefetch failed for ${url}:`, error);
    }
  }
}

// Intercept fetch requests to serve from prefetch cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/api/proxy') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
