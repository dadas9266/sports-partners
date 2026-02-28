// public/service-worker.js
// PWA service worker — cache-first + Web Push bildirimleri
const CACHE_NAME = 'sp-app-v2';
const toCache = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(toCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini cache'le, API rotalarını atla
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// ── Web Push Bildirimleri ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'SporPartner', body: event.data.text() }; }

  const title = payload.title ?? 'SporPartner';
  const options = {
    body: payload.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link: payload.link ?? '/' },
    tag: payload.tag ?? 'sp-notif',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca ilgili sayfaya yönlendir
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cls) => {
      const existing = cls.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(link); }
      else clients.openWindow(link);
    })
  );
});
