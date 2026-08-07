/* Challenge the Footage — kill-switch service worker.
 * Prior versions intercepted navigations and blanked iOS Safari (esp. /media).
 * This build clears caches, unregisters itself, and reloads open clients.
 * Do not add fetch listeners here.
 */
const CACHE_VERSION = "ctf-sw-kill-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      try {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        await Promise.all(
          clients.map((client) => {
            if (typeof client.navigate === "function") {
              return client.navigate(client.url);
            }
            return null;
          })
        );
      } catch {
        /* ignore */
      }
    })()
  );
});

// Intentionally no fetch handler — browser loads HTML/JS directly.
void CACHE_VERSION;
