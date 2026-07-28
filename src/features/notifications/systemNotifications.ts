import type { NotificationRealtimeRow } from './notifications.types';

const workerPath = '/notification-worker.js';

export function systemNotificationSupport() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function systemNotificationPermission() {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

export async function requestSystemNotificationPermission() {
  if (!systemNotificationSupport()) {
    return 'unsupported' as const;
  }

  await navigator.serviceWorker.register(workerPath);
  return Notification.requestPermission();
}

export async function showSystemNotification(notification: NotificationRealtimeRow) {
  if (!systemNotificationSupport() || Notification.permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.register(workerPath);
  await registration.showNotification(notification.title, {
    badge: '/crypt-mark.svg',
    body: notification.body,
    data: { targetPath: notification.target_path ?? '/app/notificacoes' },
    icon: '/crypt-mark.svg',
    tag: `crypt-${notification.id}`,
  });
}
