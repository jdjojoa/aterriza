// Aterriza service worker.
// - Precaches the app shell (offline page, its CSS/JS, icons, manifest).
// - Pages: network-first, falling back to the cached copy, then /offline.
// - Hashed build assets (/_next/static) and icons: cache-first.
// - Never touches /api, /auth or any cross-origin request (Supabase, OSM tiles, Gemini).
// Bump VERSION to drop old caches after changing this file.

const VERSION = "v2"; // v2: blue/lilac icons
const SHELL_CACHE = `aterriza-shell-${VERSION}`;
const PAGES_CACHE = "aterriza-pages"; // Also cleared on sign-out (ProfileMenu.tsx).
const OFFLINE_URL = "/offline";

const SHELL_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.svg",
  "/icons/icon-192.png?v=2",
  "/icons/icon-512.png?v=2",
  "/icons/icon-maskable-512.png?v=2",
];

// Paths that must always go straight to the network.
const BYPASS_PREFIXES = ["/api/", "/auth/", "/admin", "/onboarding"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL_URLS);
      // Also cache the CSS/JS the offline page needs so it renders styled.
      const offline = await cache.match(OFFLINE_URL);
      if (offline) {
        const html = await offline.clone().text();
        const assets = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map(
          (match) => match[1],
        );
        await cache.addAll([...new Set(assets)]);
      }
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
          .filter((key) => key.startsWith("aterriza-shell-") && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, maps, fonts…
  if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  }
  // Everything else (RSC payloads, images…) uses the browser's default handling.
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    // Only keep plain successful same-origin pages, never redirects.
    if (response.ok && response.type === "basic" && !response.redirected) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}
