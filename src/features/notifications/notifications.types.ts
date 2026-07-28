export type NotificationType =
  'channel_mention' | 'direct_message' | 'friend_accepted' | 'friend_request' | 'moderation_report';

export type CryptNotification = {
  actor_avatar_path: null | string;
  actor_display_name: null | string;
  actor_handle: null | string;
  actor_id: null | string;
  body: string;
  created_at: string;
  notification_id: string;
  notification_type: NotificationType;
  read_at: null | string;
  resource_id: null | string;
  target_path: null | string;
  title: string;
};

export type NotificationPreferences = {
  direct_messages_enabled: boolean;
  friend_activity_enabled: boolean;
  in_app_enabled: boolean;
  mentions_enabled: boolean;
  moderation_enabled: boolean;
  sound_enabled: boolean;
  system_enabled: boolean;
};

export type NotificationRealtimeRow = {
  body: string;
  created_at: string;
  id: string;
  notification_type: NotificationType;
  recipient_id: string;
  target_path: null | string;
  title: string;
};
