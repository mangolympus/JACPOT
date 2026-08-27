// Zero — service worker.
//
// Two jobs:
// 1. Satisfy PWA installability (Chrome/Android requires an active service
//    worker with a fetch handler before it'll offer an install prompt).
//    Still deliberately caches nothing — every request passes straight to
//    the network, same as if this file didn't exist for that purpose.
// 2. Actually display push notifications when they arrive from the backend
//    push server, including while no tab is open. This is the one thing a
//    static HTML file cannot do on its own — a push message arriving with
//    nothing listening would just be dropped without this handler.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: let the request pass through to the network untouched.
});

// Fired when the browser receives a push message from the server (see
// server/server.js's /api/broadcast and /api/notify-user). The payload is
// whatever JSON the server sent as the push body.
self.addEventListener('push', (event) => {
  let data = { title: 'Zero', body: 'You have a new compliance notification.', url: '/' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch (e) { data.body = event.data.text() || data.body; }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'zero-push',
      data: { url: data.url || '/' },
    })
  );
});

// Fired when someone taps/clicks the notification itself — focuses an
// existing tab if one's open, otherwise opens a new one at the app's URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
