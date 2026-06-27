self.addEventListener('push', (event) => {
  let data = { title: 'ToT', body: 'New notification' };
  try {
    data = event.data.json();
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ToT', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';

  if (data.entityType === 'thought' && data.entityId) {
    url = `/thought/${data.entityId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
