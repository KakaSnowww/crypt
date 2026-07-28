import { getSupabaseClient } from '../../lib/supabase/client';
import { toNotificationError } from './notifications.errors';
import type { CryptNotification, NotificationPreferences } from './notifications.types';

const defaultPreferences: NotificationPreferences = {
  direct_messages_enabled: true,
  friend_activity_enabled: true,
  in_app_enabled: true,
  mentions_enabled: true,
  moderation_enabled: true,
  sound_enabled: true,
  system_enabled: false,
};

export async function fetchNotifications(
  unreadOnly = false,
  beforeCreatedAt: null | string = null,
): Promise<CryptNotification[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_notifications', {
    before_created_at: beforeCreatedAt,
    result_limit: 50,
    unread_only: unreadOnly,
  });

  if (error) {
    throw toNotificationError(error);
  }

  return (data ?? []) as CryptNotification[];
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await getSupabaseClient().rpc('get_my_notification_preferences');

  if (error) {
    throw toNotificationError(error);
  }

  return data?.[0] ?? defaultPreferences;
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const { error } = await getSupabaseClient().rpc('save_my_notification_preferences', {
    enable_direct_messages: preferences.direct_messages_enabled,
    enable_friend_activity: preferences.friend_activity_enabled,
    enable_in_app: preferences.in_app_enabled,
    enable_mentions: preferences.mentions_enabled,
    enable_moderation: preferences.moderation_enabled,
    enable_sound: preferences.sound_enabled,
    enable_system: preferences.system_enabled,
  });

  if (error) {
    throw toNotificationError(error);
  }
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await getSupabaseClient().rpc('mark_notification_read', {
    target_notification_id: notificationId,
  });

  if (error) {
    throw toNotificationError(error);
  }
}

export async function markAllNotificationsRead() {
  const { error } = await getSupabaseClient().rpc('mark_all_notifications_read');

  if (error) {
    throw toNotificationError(error);
  }
}
