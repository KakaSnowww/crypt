import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { openCryptAppPath } from '../../lib/desktopDeepLinks';
import { isAndroidRuntime } from '../../lib/platform';
import { notificationKeys } from './notifications.queries';
import { pushTargetPath, registerCurrentPushDevice } from './pushDevices';

const permissionChangedEvent = 'crypt:android-permissions-changed';

export function AndroidPushRegistration() {
  const { status, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAndroidRuntime() || status !== 'authenticated' || !user) return;

    let active = true;
    let registering = false;
    const removers: Array<() => Promise<void> | void> = [];

    const configure = async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      await Promise.all([
        PushNotifications.createChannel({
          description: 'Mensagens privadas e menções recebidas no Crypt.',
          id: 'crypt-messages-v1',
          importance: 4,
          lights: true,
          lightColor: '#7C3AED',
          name: 'Mensagens e menções',
          sound: 'som1.mp3',
          vibration: true,
          visibility: 1,
        }),
        PushNotifications.createChannel({
          description: 'Pedidos e confirmações de amizade do Crypt.',
          id: 'crypt-friends-v1',
          importance: 4,
          lights: true,
          lightColor: '#7C3AED',
          name: 'Amizades',
          sound: 'som4.mp3',
          vibration: true,
          visibility: 1,
        }),
        PushNotifications.createChannel({
          description: 'Alertas do Crypt sem som.',
          id: 'crypt-silent-v1',
          importance: 3,
          lights: true,
          lightColor: '#7C3AED',
          name: 'Alertas silenciosos',
          vibration: false,
          visibility: 1,
        }),
      ]);

      const registration = await PushNotifications.addListener('registration', ({ value }) => {
        if (!active) return;
        void registerCurrentPushDevice(value).catch((error: unknown) => {
          console.error('Crypt push registration failed', error);
        });
      });
      removers.push(() => registration.remove());

      const registrationError = await PushNotifications.addListener('registrationError', (error) =>
        console.error('Android rejected Crypt push registration', error),
      );
      removers.push(() => registrationError.remove());

      const received = await PushNotifications.addListener('pushNotificationReceived', () => {
        if (!active) return;
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      });
      removers.push(() => received.remove());

      const action = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        ({ notification }) => {
          if (!active) return;
          openCryptAppPath(pushTargetPath(notification.data));
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        },
      );
      removers.push(() => action.remove());

      const tryRegister = async () => {
        if (registering) return;
        registering = true;
        try {
          const permission = await PushNotifications.checkPermissions();
          if (permission.receive === 'granted') await PushNotifications.register();
        } finally {
          registering = false;
        }
      };

      const handlePermissionChange = () => void tryRegister().catch(() => undefined);
      window.addEventListener(permissionChangedEvent, handlePermissionChange);
      removers.push(() =>
        window.removeEventListener(permissionChangedEvent, handlePermissionChange),
      );

      await tryRegister();
    };

    void configure().catch((error: unknown) => {
      console.error('Crypt Android push setup failed', error);
    });

    return () => {
      active = false;
      for (const remove of removers) void remove();
    };
  }, [queryClient, status, user]);

  return null;
}
