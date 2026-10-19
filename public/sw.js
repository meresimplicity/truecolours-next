/* TRUECOLOURS conservative application-shell service worker.
 *
 * This worker intentionally does not implement an offline transaction queue.
 * Business mutations must be handled by the application's idempotent sync layer.
 */

const CACHE_PREFIX = "truecolours-pwa";
const CACHE_VERSION = "v5";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const ACTIVE_CACHES = new Set([SHELL_CACHE, STATIC_CACHE]);
const PRIVATE_SHELL_CACHED_AT = "X-Truecolours-Cached-At";
const PRIVATE_SHELL_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const NETWORK_TIMEOUT_MS = 10_000;

const PUBLIC_SHELL_PATHS = [
  "/",
  "/catalogue",
  "/privacy-policy",
  "/refunds-returns",
];

// These pages render client-side business data from IndexedDB. Their HTML is
// only an application shell; APIs, RSC payloads, invoice/order details and
// other authenticated responses are never cached by this worker.
const ADMIN_SHELL_PATHS = [];

const PRECACHE_URLS = [
  ...PUBLIC_SHELL_PATHS,
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/apple-touch-icon.png",
  "/images/logo.png",
];

const BLOCKED_PATH_PREFIXES = [
  "/admin/",
  "/api/",
  "/account/",
  "/invoice/",
  "/auth/",
  "/_next/data/",
  "/_next/image",
  "/customer-uploads/",
  "/private/",
  "/uploads/",
];

const STATIC_PATH_PREFIXES = [
  "/_next/static/",
  "/images/",
  "/products/",
  "/catalogue-supplier-images/",
];

const STATIC_FILE_PATTERN = /\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webp|woff2?)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      // One unavailable route must not prevent the worker from installing.
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const response = await fetchWithTimeout(url, {
            cache: "reload",
            credentials: "same-origin",
          });
          if (isCacheableResponse(response, url.endsWith(".png") || url.endsWith(".ico"))) {
            await cache.put(url, response);
          }
        })
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && !ACTIVE_CACHES.has(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
      await broadcast({ type: "TRUECOLOURS_SW_READY" });
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!shouldHandle(request)) return;

  const url = new URL(request.url);

  if (request.mode === "navigate" && ADMIN_SHELL_PATHS.includes(url.pathname)) {
    event.respondWith(networkFirstAdminShell(request, url));
    return;
  }

  if (request.mode === "navigate" && PUBLIC_SHELL_PATHS.includes(url.pathname)) {
    event.respondWith(networkFirstPublicShell(request, url));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirstStatic(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "TRUECOLOURS_SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "TRUECOLOURS_PING") {
    event.source?.postMessage({ type: "TRUECOLOURS_SW_READY" });
    return;
  }

  if (event.data?.type === "TRUECOLOURS_CLEAR_PRIVATE_CACHE") {
    event.waitUntil(
      clearPrivateShellCache().then((deleted) => {
        replyToMessage(event, { type: "TRUECOLOURS_PRIVATE_CACHE_CLEARED", deleted });
      })
    );
    return;
  }

  if (event.data?.type === "TRUECOLOURS_PREPARE_PRIVATE_SHELLS") {
    event.waitUntil(
      cachePrivateAdminShells().then((cachedPaths) => {
        replyToMessage(event, { type: "TRUECOLOURS_PRIVATE_SHELLS_READY", cachedPaths });
      })
    );
  }
});

function shouldHandle(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (request.headers.has("authorization")) return false;
  if (request.headers.get("range")) return false;
  if (request.headers.get("rsc") || request.headers.get("next-router-prefetch")) return false;
  if (url.searchParams.has("_rsc") || url.searchParams.has("__nextDataReq")) return false;

  const path = normalizedPath(url.pathname);
  if (path === "/admin" || path.startsWith("/admin/")) {
    return request.mode === "navigate" && ADMIN_SHELL_PATHS.includes(path);
  }
  return !BLOCKED_PATH_PREFIXES.some(
    (prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix)
  );
}

async function networkFirstAdminShell(request, url) {
  const cache = await caches.open(SHELL_CACHE);
  const cacheKey = adminShellCacheKey(url);

  try {
    const response = await fetchWithTimeout(request);
    if (isCacheableAdminShell(response, url.pathname)) {
      await cacheAdminShellResponse(cache, cacheKey, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
    if (cached && isFreshPrivateShell(cached)) return cached;
    if (cached) await cache.delete(cacheKey);

    return new Response(
      `<!doctype html><html lang="en-ZA"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="theme-color" content="#0f172a"><title>TRUECOLOURS Offline</title><body style="margin:0;background:#f5f6f7;color:#0f172a;font:16px system-ui"><main style="max-width:36rem;margin:12vh auto;padding:2rem"><img src="/images/logo.png" alt="TRUECOLOURS" style="display:block;max-width:100%;height:auto"><h1>This page is not cached yet</h1><p>Reconnect once and open this dashboard page. After that, its approved application shell can reopen offline.</p><button onclick="location.reload()" style="min-height:44px;border:0;border-radius:10px;background:#0f172a;color:white;padding:0 18px;font-weight:700">Try again</button></main></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }
}

function adminShellCacheKey(url) {
  return new Request(`${url.origin}${url.pathname}`, {
    credentials: "same-origin",
    headers: { Accept: "text/html", "X-Truecolours-Shell": "admin" },
  });
}

function isCacheableAdminShell(response, expectedPath) {
  if (!response || !response.ok || response.status !== 200) return false;
  if (!["basic", "default"].includes(response.type)) return false;
  if (response.redirected) return false;
  if (response.headers.has("set-cookie")) return false;

  try {
    if (normalizedPath(new URL(response.url).pathname) !== normalizedPath(expectedPath)) return false;
  } catch {
    return false;
  }

  const vary = (response.headers.get("vary") || "").toLowerCase();
  if (vary.trim() === "*" || vary.includes("cookie") || vary.includes("authorization")) return false;

  return (response.headers.get("content-type") || "").toLowerCase().includes("text/html");
}

async function clearPrivateShellCache() {
  const cache = await caches.open(SHELL_CACHE);
  const requests = await cache.keys();
  const privateRequests = requests.filter((request) => new URL(request.url).pathname.startsWith("/admin/"));
  await Promise.all(privateRequests.map((request) => cache.delete(request)));
  return privateRequests.length;
}

async function cachePrivateAdminShells() {
  const cache = await caches.open(SHELL_CACHE);
  const results = await Promise.all(ADMIN_SHELL_PATHS.map(async (path) => {
    try {
      const url = new URL(path, self.location.origin);
      const response = await fetchWithTimeout(new Request(url, {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "text/html" },
      }));
      if (!isCacheableAdminShell(response, path)) return null;
      await cacheAdminShellResponse(cache, adminShellCacheKey(url), response);
      return path;
    } catch {
      // A partial private-shell refresh keeps the last valid unexpired entries.
      return null;
    }
  }));

  return results.filter(Boolean);
}

async function cacheAdminShellResponse(cache, cacheKey, response) {
  const htmlResponse = response.clone();
  await cache.put(cacheKey, stampPrivateShell(response));
  await cacheStaticAssetsFromHtml(await htmlResponse.text());
}

async function cacheStaticAssetsFromHtml(html) {
  const staticCache = await caches.open(STATIC_CACHE);
  const urls = new Set();
  const attributePattern = /(?:src|href)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(attributePattern)) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
        urls.add(url.href);
      }
    } catch {
      // Ignore malformed or non-URL attributes.
    }
  }

  await Promise.allSettled([...urls].map(async (url) => {
    const request = new Request(url, { cache: "no-store", credentials: "same-origin" });
    const cached = await staticCache.match(request);
    if (cached) return;
    const response = await fetchWithTimeout(request);
    if (isCacheableResponse(response, true)) await staticCache.put(request, response);
  }));
}

function stampPrivateShell(response) {
  const headers = new Headers(response.headers);
  headers.set(PRIVATE_SHELL_CACHED_AT, new Date().toISOString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isFreshPrivateShell(response) {
  const cachedAt = new Date(response.headers.get(PRIVATE_SHELL_CACHED_AT) || "").getTime();
  return Number.isFinite(cachedAt) && Date.now() - cachedAt <= PRIVATE_SHELL_MAX_AGE_MS;
}

function isStaticAsset(request, url) {
  const path = normalizedPath(url.pathname);
  if (STATIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

  return (
    ["font", "image", "script", "style"].includes(request.destination) &&
    STATIC_FILE_PATTERN.test(path)
  );
}

async function networkFirstPublicShell(request, url) {
  const cache = await caches.open(SHELL_CACHE);
  const cacheKey = new Request(`${url.origin}${url.pathname}`, {
    credentials: "same-origin",
    headers: { Accept: "text/html" },
  });

  try {
    const response = await fetchWithTimeout(request);
    if (!url.search && isCacheableResponse(response, false)) {
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const fallback = await cache.match("/");
    if (fallback) return fallback;

    return new Response("TRUECOLOURS is offline. Reconnect and try again.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheableResponse(response, true)) {
    await cache.put(request, response.clone());
  }
  return response;
}

function isCacheableResponse(response, staticAsset) {
  if (!response || !response.ok || response.status !== 200) return false;
  if (!['basic', 'default'].includes(response.type)) return false;

  const cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) return false;
  if (response.headers.has("set-cookie")) return false;

  const vary = (response.headers.get("vary") || "").toLowerCase();
  if (vary.trim() === "*" || vary.includes("cookie") || vary.includes("authorization")) return false;

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  return staticAsset || contentType.includes("text/html");
}

function normalizedPath(pathname) {
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.forEach((client) => client.postMessage(message));
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function replyToMessage(event, message) {
  if (event.ports?.[0]) event.ports[0].postMessage(message);
  else event.source?.postMessage(message);
}
