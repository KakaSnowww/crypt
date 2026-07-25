import type { Database } from '../../types/database';

export type Interest = Database['public']['Tables']['interests']['Row'];
export type InterestCategory = Database['public']['Tables']['interest_categories']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileSettings = Database['public']['Tables']['profile_settings']['Row'];

export type InterestCategoryWithItems = InterestCategory & {
  interests: Interest[];
};

export type SpotifyTrackPreview = {
  normalizedUrl: string;
  thumbnailUrl: null | string;
  title: string;
  trackId: string;
};

export type PrivacyValues = Pick<
  ProfileSettings,
  | 'allow_direct_messages'
  | 'allow_friend_requests'
  | 'hide_all_interests'
  | 'show_interests_on_profile'
  | 'show_mutual_friends'
  | 'show_mutual_servers'
  | 'show_online_status'
  | 'use_interests_for_suggestions'
>;
