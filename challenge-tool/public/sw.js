/* Challenge the Footage — app-shell service worker */
const CACHE_VERSION = "ctf-shell-v5";
// Precache only stable static files. Never precache HTML — bad shells blank iOS Safari.
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
      .catch(() => self.skipWaiting())
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
      .catch(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/og.png" ||
    url.pathname === "/site.webmanifest" ||
    url.pathname === "/sw.js"
  );
}

function offlineResponse() {
  return new Response("Offline — open Challenge the Footage when you have a connection.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** respondWith must never receive a rejected promise or non-Response. */
function safeRespond(event, handler) {
  event.respondWith(
    Promise.resolve()
      .then(handler)
      .then((response) => {
        if (response instanceof Response) return response;
        return offlineResponse();
      })
      .catch(() => offlineResponse())
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  // Critical: do not intercept document navigations. iOS Safari shows a blank
  // white page when a SW FetchEvent for navigate rejects or returns a bad body
  // (seen on /media.html and other multi-page shells). Let the browser fetch HTML.
  if (request.mode === "navigate") return;

  // Only cache hashed/static assets — not HTML shells.
  if (isStaticAsset(url)) {
    safeRespond(event, () => cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached instanceof Response) return cached;
  const fresh = await fetch(request);
  if (fresh instanceof Response && fresh.ok) {
    try {
      await cache.put(request, fresh.clone());
    } catch {
      /* ignore quota / opaque failures */
    }
  }
  return fresh instanceof Response ? fresh : offlineResponse();
}
