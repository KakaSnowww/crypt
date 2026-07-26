import { getSupabaseClient } from '../../lib/supabase/client';
import { toConnectionActionError } from './connections.errors';
import type {
  BlockedProfile,
  ConnectionNotification,
  FriendProfile,
  FriendRequestProfile,
  FriendSuggestion,
  PublicConnectionProfile,
  SearchProfile,
} from './connections.types';

export async function searchProfiles(searchTerm: string): Promise<SearchProfile[]> {
  const { data, error } = await getSupabaseClient().rpc('search_profiles', {
    result_limit: 20,
    search_term: searchTerm,
  });

  if (error) {
    throw toConnectionActionError(error);
  }

  return (data ?? []) as SearchProfile[];
}

export async function fetchFriends(): Promise<FriendProfile[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_friends');

  if (error) {
    throw toConnectionActionError(error);
  }

  return data ?? [];
}

export async function fetchFriendRequests(
  direction: 'received' | 'sent',
): Promise<FriendRequestProfile[]> {
  const { data, error } = await getSupabaseClient().rpc('get_friend_requests', {
    request_direction: direction,
  });

  if (error) {
    throw toConnectionActionError(error);
  }

  return data ?? [];
}

export async function fetchFriendSuggestions(): Promise<FriendSuggestion[]> {
  const { data, error } = await getSupabaseClient().rpc('get_friend_suggestions', {
    result_limit: 20,
  });

  if (error) {
    throw toConnectionActionError(error);
  }

  return data ?? [];
}

export async function fetchBlockedProfiles(): Promise<BlockedProfile[]> {
  const { data, error } = await getSupabaseClient().rpc('get_blocked_profiles');

  if (error) {
    throw toConnectionActionError(error);
  }

  return data ?? [];
}

export async function fetchConnectionNotifications(): Promise<ConnectionNotification[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_connection_notifications', {
    result_limit: 30,
  });

  if (error) {
    throw toConnectionActionError(error);
  }

  return data ?? [];
}

export async function fetchPublicProfile(handle: string): Promise<null | PublicConnectionProfile> {
  const { data, error } = await getSupabaseClient().rpc('get_public_profile_by_handle', {
    target_handle: handle,
  });

  if (error) {
    throw toConnectionActionError(error);
  }

  return (data?.[0] as PublicConnectionProfile | undefined) ?? null;
}

export async function sendFriendRequest(profileId: string) {
  const { data, error } = await getSupabaseClient().rpc('send_friend_request', {
    target_profile_id: profileId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }

  return data;
}

export async function cancelFriendRequest(requestId: string) {
  const { error } = await getSupabaseClient().rpc('cancel_friend_request', {
    target_request_id: requestId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }
}

export async function respondFriendRequest(requestId: string, accept: boolean) {
  const { error } = await getSupabaseClient().rpc('respond_friend_request', {
    accept_request: accept,
    target_request_id: requestId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }
}

export async function removeFriend(profileId: string) {
  const { error } = await getSupabaseClient().rpc('remove_friend', {
    target_profile_id: profileId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }
}

export async function reportProfile(profileId: string, reason: string, details: null | string) {
  const { data, error } = await getSupabaseClient().rpc('report_profile', {
    report_details: details,
    report_reason: reason,
    target_profile_id: profileId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }

  return data;
}

export async function blockProfile(profileId: string) {
  const { error } = await getSupabaseClient().rpc('block_profile', {
    target_profile_id: profileId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }
}

export async function unblockProfile(profileId: string) {
  const { error } = await getSupabaseClient().rpc('unblock_profile', {
    target_profile_id: profileId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }
}

export async function dismissFriendSuggestion(profileId: string, permanently: boolean) {
  const { error } = await getSupabaseClient().rpc('dismiss_friend_suggestion', {
    dismiss_permanently: permanently,
    target_profile_id: profileId,
  });

  if (error) {
    throw toConnectionActionError(error);
  }
}

export async function markConnectionNotificationsRead() {
  const { error } = await getSupabaseClient().rpc('mark_connection_notifications_read');

  if (error) {
    throw toConnectionActionError(error);
  }
}

export async function setMyPresence(status: 'away' | 'busy' | 'offline' | 'online') {
  const { error } = await getSupabaseClient().rpc('set_my_presence', {
    next_status: status,
  });

  if (error) {
    throw toConnectionActionError(error);
  }
}
