/* Challenge the Footage — app-shell service worker */
const CACHE_VERSION = "ctf-shell-v4";
// Precache only stable static files. Do not precache "/" / HTML shells —
// a prior outage cached redirect responses and blanked iOS Safari.
const PRECACHE = [
  "/site.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png",
  "/og.png",
  "/robots.txt",
  "/fonts/outfit-latin.woff2",
  "/fonts/instrument-serif-latin.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isNavigational(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (isNavigational(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Hashed build assets and icons: cache-first after first fetch
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/og.png" ||
    url.pathname === "/site.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function offlineResponse() {
  return new Response("Offline — open Challenge the Footage when you have a connection.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    // Never cache redirects / empty error shells — they blank the app on iOS.
    if (fresh instanceof Response && fresh.ok) {
      try {
        await cache.put(request, fresh.clone());
      } catch {
        /* ignore quota / opaque failures */
      }
      return fresh;
    }
    const cached = await cache.match(request);
    if (cached instanceof Response && cached.ok) return cached;
    if (fresh instanceof Response) return fresh;
    return offlineResponse();
  } catch {
    const cached = await cache.match(request);
    if (cached instanceof Response && cached.ok) return cached;
    return offlineResponse();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || network;
}
