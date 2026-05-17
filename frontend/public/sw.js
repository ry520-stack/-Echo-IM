self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Echo';
  const options = {
    body: data.body || '新消息',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'echo',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) {
        clients.openWindow('/');
      }
    })
  );
});
