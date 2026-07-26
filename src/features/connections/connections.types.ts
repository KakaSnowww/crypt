import type { Database } from '../../types/database';

type Functions = Database['public']['Functions'];

export type RelationshipStatus =
  'blocked' | 'friends' | 'incoming_request' | 'none' | 'outgoing_request' | 'self';

export type SearchProfile = Omit<
  Functions['search_profiles']['Returns'][number],
  'relationship_status'
> & {
  relationship_status: RelationshipStatus;
};

export type FriendProfile = Functions['get_my_friends']['Returns'][number];
export type FriendRequestProfile = Functions['get_friend_requests']['Returns'][number];
export type FriendSuggestion = Functions['get_friend_suggestions']['Returns'][number];
export type BlockedProfile = Functions['get_blocked_profiles']['Returns'][number];
export type ConnectionNotification =
  Functions['get_my_connection_notifications']['Returns'][number];

export type PublicConnectionProfile = Omit<
  Functions['get_public_profile_by_handle']['Returns'][number],
  'relationship_status'
> & {
  relationship_status: RelationshipStatus;
};

export type ConnectionsTab = 'blocked' | 'discover' | 'friends' | 'notifications' | 'requests';
