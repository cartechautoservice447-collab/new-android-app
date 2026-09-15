/* eslint-disable no-restricted-globals */
'use strict';

// ─── Lifecycle ────────────────────────────────────────────────────────────────
// Skip the waiting phase immediately so the SW becomes active on first install
// without requiring a page reload.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Take control of all open clients immediately after activation.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push handler ─────────────────────────────────────────────────────────────
// Receives a push payload from the server and shows a system notification.
// Payload expected shape (JSON):
//   { id, title, body, type, source, action_url, icon }
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fallback for plain-text push data
    payload = { title: 'Liquid Glass Studio', body: event.data.text() || 'You have a new notification.' };
  }

  const title = String(payload.title || 'Liquid Glass Studio').trim();
  const options = {
    body: String(payload.body || '').trim(),
    icon: '/icon.svg',
    badge: '/icon.svg',
    // Use a stable tag per notification id to prevent duplicates if the push
    // is delivered more than once.
    tag: payload.id ? String(payload.id) : `mlg-${Date.now()}`,
    data: {
      url: payload.action_url || '/',
      notificationId: payload.id || null,
    },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click handler ───────────────────────────────────────────────
// Focuses an existing app window or opens a new one when the user taps the
// system notification. Routes to action_url if provided.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing window if one is open at this origin
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
