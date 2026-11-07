const CACHE_VERSION = "shiftmanager-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_CACHE = `${CACHE_VERSION}-offline`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const STATIC_PREFIXES = ["/_next/static/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(
              new Request(new URL(url, self.location.origin).href, {
                cache: "reload",
              }),
            );
          } catch {}
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(pathname) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPrivateOrDynamic(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith("/api/") ||
    pathname.includes("convex") ||
    url.searchParams.has("_rsc")
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(OFFLINE_CACHE);
    const cached = await cache.match(OFFLINE_URL);
    if (cached) {
      return cached;
    }
    return new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// Al pulsar una notificación, enfoca una pestaña con la URL indicada o abre
// una nueva. La URL viaja en `notification.data.url` (ver `showBrowserNotification`).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (client.url === target && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  if (isPrivateOrDynamic(url)) {
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
