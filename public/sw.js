const CACHE_NAME = "llr-prefetch-cache-v2";
const DEFAULT_API_BASE_URL = "https://llr-cf-workers.arc-6e4.workers.dev";

function buildRssRequestUrl(url, apiBaseUrl = DEFAULT_API_BASE_URL) {
  return `${apiBaseUrl.replace(/\/$/, "")}/api/rss?url=${encodeURIComponent(url)}`;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PREFETCH_RSS") {
    const urls = event.data.urls;
    const apiBaseUrl = event.data.apiBaseUrl || DEFAULT_API_BASE_URL;
    event.waitUntil(prefetchUrls(urls, apiBaseUrl));
  }
});

async function prefetchUrls(urls, apiBaseUrl) {
  const cache = await caches.open(CACHE_NAME);
  for (const url of urls) {
    try {
      const requestUrl = buildRssRequestUrl(url, apiBaseUrl);
      const response = await fetch(requestUrl, { mode: "cors" });
      if (response.ok) {
        await cache.put(requestUrl, response.clone());
        console.log(`[SW] Prefetched: ${url}`);
      }
    } catch (error) {
      console.error("[SW] Prefetch failed for %s:", url, error);
    }
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/api/rss") {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      }),
    );
  }
});
