import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToast } from '../../components/common/ToastContext';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { playCryptSound } from '../../lib/sounds';
import { notificationKeys } from './notifications.queries';
import { showSystemNotification } from './systemNotifications';
import type { NotificationPreferences, NotificationRealtimeRow } from './notifications.types';

export function useNotificationsRealtime(
  userId: null | string,
  preferences: NotificationPreferences | undefined,
) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured() || import.meta.env.MODE === 'test') {
      return;
    }

    const client = getSupabaseClient();
    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `recipient_id=eq.${userId}`,
          schema: 'public',
          table: 'user_notifications',
        },
        (payload) => {
          const notification = payload.new as NotificationRealtimeRow;
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });

          if (preferences?.in_app_enabled !== false) {
            addToast({
              message: notification.body,
              title: notification.title,
              tone: 'info',
            });
          }

          if (preferences?.system_enabled) {
            void showSystemNotification(notification);
          }

          if (preferences?.sound_enabled) {
            if (notification.notification_type === 'friend_request') {
              playCryptSound('friend-request');
            } else if (
              notification.notification_type === 'direct_message' ||
              notification.notification_type === 'channel_mention'
            ) {
              playCryptSound('message');
            }
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [addToast, preferences, queryClient, userId]);
}
