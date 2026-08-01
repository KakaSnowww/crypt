import type { NotificationRealtimeRow } from './notifications.types';
import { openCryptAppPath } from '../../lib/desktopDeepLinks';
import { isAndroidRuntime, isElectronRuntime } from '../../lib/platform';

const workerPath = '/notification-worker.js';
const androidChannelId = 'crypt-alerts-v1';

export type SystemNotificationPermission = NotificationPermission | 'unsupported';

let androidPermission: SystemNotificationPermission = 'default';

export function systemNotificationSupport() {
  if (isAndroidRuntime()) return true;

  if (isElectronRuntime()) {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function systemNotificationPermission(): SystemNotificationPermission {
  if (isAndroidRuntime()) return androidPermission;
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

export async function requestSystemNotificationPermission() {
  if (!systemNotificationSupport()) {
    return 'unsupported' as const;
  }

  if (isAndroidRuntime()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const current = await LocalNotifications.checkPermissions();
    const result =
      current.display === 'prompt' || current.display === 'prompt-with-rationale'
        ? await LocalNotifications.requestPermissions()
        : current;
    androidPermission = normalizeAndroidPermission(result.display);
    return androidPermission;
  }

  if (isElectronRuntime()) {
    return Notification.requestPermission();
  }

  await navigator.serviceWorker.register(workerPath);
  return Notification.requestPermission();
}

export async function showSystemNotification(notification: NotificationRealtimeRow) {
  if (!systemNotificationSupport()) {
    return;
  }

  if (isAndroidRuntime()) {
    if (androidPermission !== 'granted') return;

    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [
        {
          autoCancel: true,
          body: notification.body,
          channelId: androidChannelId,
          extra: {
            targetPath: notification.target_path ?? '/app/notificacoes',
          },
          id: notificationIdFromString(notification.id),
          largeBody: notification.body,
          smallIcon: 'ic_stat_crypt',
          summaryText: 'Crypt',
          title: notification.title,
        },
      ],
    });
    return;
  }

  if (isElectronRuntime()) {
    if (Notification.permission !== 'granted') return;

    const desktopNotification = new Notification(notification.title, {
      body: notification.body,
      icon: '/crypt-mark.svg',
      tag: `crypt-${notification.id}`,
    });
    desktopNotification.onclick = () => {
      window.focus();
      window.history.pushState({}, '', notification.target_path ?? '/app/notificacoes');
      window.dispatchEvent(new PopStateEvent('popstate'));
      desktopNotification.close();
    };
    return;
  }

  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.register(workerPath);
  await registration.showNotification(notification.title, {
    badge: '/crypt-mark.svg',
    body: notification.body,
    data: { targetPath: notification.target_path ?? '/app/notificacoes' },
    icon: '/crypt-mark.svg',
    tag: `crypt-${notification.id}`,
  });
}

export async function configureAndroidSystemNotifications() {
  if (!isAndroidRuntime()) return;

  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const permission = await LocalNotifications.checkPermissions();
  androidPermission = normalizeAndroidPermission(permission.display);

  await LocalNotifications.createChannel({
    description: 'Mensagens, menções, amizades e avisos do Crypt.',
    id: androidChannelId,
    importance: 4,
    lights: true,
    lightColor: '#7C3AED',
    name: 'Alertas do Crypt',
    vibration: true,
    visibility: 1,
  });

  await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const extra = notification.extra as { targetPath?: unknown } | undefined;
    if (typeof extra?.targetPath === 'string') {
      openCryptAppPath(extra.targetPath);
    }
  });
}

export function notificationIdFromString(value: string) {
  let hash = 0;
  for (const character of value) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  }
  return hash & 0x7fffffff || 1;
}

function normalizeAndroidPermission(
  value: 'denied' | 'granted' | 'prompt' | 'prompt-with-rationale',
): SystemNotificationPermission {
  if (value === 'granted' || value === 'denied') return value;
  return 'default';
}
