// Ora service worker: offline app shell, cached fonts, fresh pages when online.
const VERSION = "ora-v1";
const SHELL = ["/app/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-48.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Pages: network first so updates arrive, cache as fallback offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put("/app/", copy)); return res;
    }).catch(() => caches.match("/app/")));
    return;
  }
  // Fonts and icons: cache first, refresh in background.
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
