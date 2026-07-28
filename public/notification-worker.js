self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.targetPath || '/app/notificacoes';

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      const existingClient = clients[0];
      if (existingClient) {
        existingClient.navigate(targetPath);
        return existingClient.focus();
      }
      return self.clients.openWindow(targetPath);
    }),
  );
});
