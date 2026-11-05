// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const ORIGIN = "https://shiftmanager.test";
const SOURCE = readFileSync(
  new URL("../../../public/sw.js", import.meta.url),
  "utf8",
);

type Listener = (event: unknown) => void;

function basicResponse(body: string, status = 200) {
  const response = new Response(body, { status });
  Object.defineProperty(response, "type", { value: "basic" });
  return response;
}

function createCacheStore() {
  const store = new Map<string, Response>();
  const cache = {
    add: vi.fn(async (request: Request) => {
      store.set(request.url, new Response("precached"));
    }),
    match: vi.fn(async (request: Request | string) => {
      const key =
        typeof request === "string"
          ? new URL(request, ORIGIN).href
          : request.url;
      return store.get(key)?.clone();
    }),
    put: vi.fn(async (request: Request, response: Response) => {
      store.set(request.url, response);
    }),
  };

  return { store, cache };
}

function createCaches() {
  const stores = new Map<string, ReturnType<typeof createCacheStore>>();

  const caches = {
    open: vi.fn(async (name: string) => {
      let entry = stores.get(name);
      if (!entry) {
        entry = createCacheStore();
        stores.set(name, entry);
      }
      return entry.cache;
    }),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
  };

  return { caches, stores };
}

function loadServiceWorker(fetchImpl: typeof fetch) {
  const listeners = new Map<string, Listener>();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Listener) => {
      listeners.set(type, handler);
    },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
  };

  const { caches, stores } = createCaches();
  new Function("self", "caches", "fetch", SOURCE)(self, caches, fetchImpl);

  return { listeners, stores };
}

function dispatchLifecycle(
  listeners: Map<string, Listener>,
  type: "install" | "activate",
) {
  let pending: Promise<void> | undefined;
  const event = {
    waitUntil: (promise: Promise<void>) => {
      pending = promise;
    },
  };

  listeners.get(type)?.(event);
  return pending;
}

function dispatchFetch(
  listeners: Map<string, Listener>,
  request: { method: string; mode: string; url: string },
) {
  let responded: Promise<Response> | undefined;
  const event = {
    request,
    respondWith: (promise: Promise<Response>) => {
      responded = promise;
    },
  };

  listeners.get("fetch")?.(event);
  return responded;
}

describe("service worker", () => {
  it("precachea la página offline, el manifest y los iconos", async () => {
    const { listeners, stores } = loadServiceWorker(vi.fn());

    await dispatchLifecycle(listeners, "install");

    const offlineCache = stores.get("shiftmanager-v1-offline");
    expect(offlineCache?.cache.add).toHaveBeenCalledTimes(4);
    expect(offlineCache?.store.has(`${ORIGIN}/offline`)).toBe(true);
    expect(offlineCache?.store.has(`${ORIGIN}/manifest.webmanifest`)).toBe(true);
    expect(
      offlineCache?.store.has(`${ORIGIN}/icons/icon-192.png`),
    ).toBe(true);
  });

  it("nunca intercepta peticiones no GET ni de otro origen", () => {
    const { listeners } = loadServiceWorker(vi.fn());

    expect(
      dispatchFetch(listeners, {
        method: "POST",
        mode: "cors",
        url: `${ORIGIN}/api/data`,
      }),
    ).toBeUndefined();

    expect(
      dispatchFetch(listeners, {
        method: "GET",
        mode: "cors",
        url: "https://example.convex.cloud/api/query",
      }),
    ).toBeUndefined();
  });

  it("nunca cachea peticiones de datos ni RSC", () => {
    const { listeners } = loadServiceWorker(vi.fn());

    expect(
      dispatchFetch(listeners, {
        method: "GET",
        mode: "cors",
        url: `${ORIGIN}/api/private`,
      }),
    ).toBeUndefined();

    expect(
      dispatchFetch(listeners, {
        method: "GET",
        mode: "cors",
        url: `${ORIGIN}/dashboard?_rsc=abc`,
      }),
    ).toBeUndefined();
  });

  it("sirve la página offline cuando falla una navegación", async () => {
    const failingFetch = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const { listeners } = loadServiceWorker(failingFetch);

    await dispatchLifecycle(listeners, "install");

    const responded = dispatchFetch(listeners, {
      method: "GET",
      mode: "navigate",
      url: `${ORIGIN}/dashboard`,
    });

    const response = await responded;
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe("precached");
  });

  it("no guarda en caché las navegaciones aunque tengan éxito", async () => {
    const okFetch = vi.fn(async () => new Response("privado", { status: 200 }));
    const { listeners, stores } = loadServiceWorker(okFetch);

    await dispatchLifecycle(listeners, "install");

    const responded = dispatchFetch(listeners, {
      method: "GET",
      mode: "navigate",
      url: `${ORIGIN}/dashboard`,
    });

    expect(await (await responded)?.text()).toBe("privado");
    const anyPut = [...stores.values()].some(
      (entry) => entry.cache.put.mock.calls.length > 0,
    );
    expect(anyPut).toBe(false);
  });

  it("usa cache-first para recursos estáticos con hash", async () => {
    const okFetch = vi.fn(async () => basicResponse("asset"));
    const { listeners } = loadServiceWorker(okFetch);
    const request = {
      method: "GET",
      mode: "cors",
      url: `${ORIGIN}/_next/static/chunks/app.js`,
    };

    const first = await dispatchFetch(listeners, request);
    expect(await first?.text()).toBe("asset");
    expect(okFetch).toHaveBeenCalledTimes(1);

    const second = await dispatchFetch(listeners, request);
    expect(await second?.text()).toBe("asset");
    expect(okFetch).toHaveBeenCalledTimes(1);
  });
});
