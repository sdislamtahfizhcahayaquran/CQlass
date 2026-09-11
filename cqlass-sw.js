/* CQlass Web Push Service Worker */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'CQlass';
  const options = {
    body: data.body || 'Ada informasi baru di CQlass.',
    icon: './logo_sd.png',
    badge: './logo_sd.png',
    tag: data.tag || `cqlass-${Date.now()}`,
    renotify: Boolean(data.priority === 'urgent' || data.priority === 'high'),
    requireInteraction: Boolean(data.priority === 'urgent'),
    data: {
      url: data.url || './',
      notification_id: data.notification_id || null,
      type: data.type || 'general'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification?.data?.url || './', self.registration.scope).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        const current = new URL(client.url);
        const wanted = new URL(target);
        if (current.origin === wanted.origin) {
          await client.focus();
          if ('navigate' in client && client.url !== target) await client.navigate(target);
          return;
        }
      } catch (_) {}
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
