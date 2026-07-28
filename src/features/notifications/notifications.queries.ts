import { useQuery } from '@tanstack/react-query';
import { fetchNotificationPreferences, fetchNotifications } from './notifications.service';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean) => ['notifications', 'list', unreadOnly] as const,
  preferences: ['notifications', 'preferences'] as const,
};

export function useNotifications(enabled = true, unreadOnly = false) {
  return useQuery({
    enabled,
    queryFn: () => fetchNotifications(unreadOnly),
    queryKey: notificationKeys.list(unreadOnly),
  });
}

export function useNotificationPreferences(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchNotificationPreferences,
    queryKey: notificationKeys.preferences,
  });
}
