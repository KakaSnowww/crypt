import { useQuery } from '@tanstack/react-query';
import {
  fetchBlockedProfiles,
  fetchConnectionNotifications,
  fetchFriendRequests,
  fetchFriends,
  fetchFriendSuggestions,
  fetchPublicProfile,
  searchProfiles,
} from './connections.service';

export const connectionKeys = {
  all: ['connections'] as const,
  blocked: ['connections', 'blocked'] as const,
  friends: ['connections', 'friends'] as const,
  notifications: ['connections', 'notifications'] as const,
  profile: (handle: string) => ['connections', 'profile', handle] as const,
  received: ['connections', 'requests', 'received'] as const,
  search: (term: string) => ['connections', 'search', term] as const,
  sent: ['connections', 'requests', 'sent'] as const,
  suggestions: ['connections', 'suggestions'] as const,
};

export function useFriends() {
  return useQuery({
    queryFn: fetchFriends,
    queryKey: connectionKeys.friends,
  });
}

export function useReceivedFriendRequests() {
  return useQuery({
    queryFn: () => fetchFriendRequests('received'),
    queryKey: connectionKeys.received,
  });
}

export function useSentFriendRequests() {
  return useQuery({
    queryFn: () => fetchFriendRequests('sent'),
    queryKey: connectionKeys.sent,
  });
}

export function useFriendSuggestions() {
  return useQuery({
    queryFn: fetchFriendSuggestions,
    queryKey: connectionKeys.suggestions,
  });
}

export function useBlockedProfiles() {
  return useQuery({
    queryFn: fetchBlockedProfiles,
    queryKey: connectionKeys.blocked,
  });
}

export function useConnectionNotifications(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchConnectionNotifications,
    queryKey: connectionKeys.notifications,
  });
}

export function useProfileSearch(term: string) {
  return useQuery({
    enabled: term.length >= 2,
    queryFn: () => searchProfiles(term),
    queryKey: connectionKeys.search(term),
  });
}

export function usePublicConnectionProfile(handle: string) {
  return useQuery({
    enabled: handle.length >= 3,
    queryFn: () => fetchPublicProfile(handle),
    queryKey: connectionKeys.profile(handle),
  });
}
