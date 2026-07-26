export type Json = boolean | null | number | string | Json[] | { [key: string]: Json | undefined };

type NoArgs = Record<never, never>;

export type Database = {
  public: {
    CompositeTypes: Record<never, never>;
    Enums: Record<never, never>;
    Functions: {
      are_friends: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      block_profile: {
        Args: { target_profile_id: string };
        Returns: undefined;
      };
      can_start_direct_message: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      can_view_profile_interests: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      can_view_presence: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      cancel_friend_request: {
        Args: { target_request_id: string };
        Returns: undefined;
      };
      dismiss_friend_suggestion: {
        Args: {
          dismiss_permanently?: boolean;
          target_profile_id: string;
        };
        Returns: undefined;
      };
      get_blocked_profiles: {
        Args: NoArgs;
        Returns: Array<{
          avatar_path: null | string;
          blocked_at: string;
          display_name: string;
          handle: string;
          profile_id: string;
        }>;
      };
      get_connection_status: {
        Args: { target_profile_id: string };
        Returns: string;
      };
      get_friend_requests: {
        Args: { request_direction: string };
        Returns: Array<{
          avatar_path: null | string;
          bio: null | string;
          created_at: string;
          display_name: string;
          handle: string;
          mutual_friend_count: number;
          profile_id: string;
          request_id: string;
        }>;
      };
      get_friend_suggestions: {
        Args: { result_limit?: number };
        Returns: Array<{
          avatar_path: null | string;
          bio: null | string;
          display_name: string;
          handle: string;
          mutual_friend_count: number;
          profile_id: string;
          score: number;
          shared_category_labels: string[];
          shared_interest_labels: string[];
        }>;
      };
      get_mutual_friend_count: {
        Args: { target_profile_id: string };
        Returns: number;
      };
      get_my_connection_notifications: {
        Args: { result_limit?: number };
        Returns: Array<{
          actor_avatar_path: null | string;
          actor_display_name: string;
          actor_handle: string;
          actor_profile_id: string;
          created_at: string;
          notification_id: number;
          notification_type: string;
          read_at: null | string;
        }>;
      };
      get_my_friends: {
        Args: NoArgs;
        Returns: Array<{
          avatar_path: null | string;
          bio: null | string;
          display_name: string;
          friendship_created_at: string;
          handle: string;
          is_online: boolean;
          mutual_friend_count: number;
          presence_status: string;
          profile_id: string;
        }>;
      };
      get_public_profile_by_handle: {
        Args: { target_handle: string };
        Returns: Array<{
          allow_friend_requests: boolean;
          avatar_path: null | string;
          bio: null | string;
          created_at: string;
          display_name: string;
          favorite_spotify_title: null | string;
          favorite_spotify_url: null | string;
          handle: string;
          interest_category_labels: string[];
          interest_labels: string[];
          mutual_friend_count: number;
          profile_id: string;
          relationship_status: string;
        }>;
      };
      has_block_between: {
        Args: { target_profile_id: string };
        Returns: boolean;
      };
      is_handle_available: {
        Args: { candidate_handle: string };
        Returns: boolean;
      };
      mark_connection_notifications_read: {
        Args: NoArgs;
        Returns: undefined;
      };
      remove_friend: {
        Args: { target_profile_id: string };
        Returns: undefined;
      };
      report_profile: {
        Args: {
          report_details?: null | string;
          report_reason: string;
          target_profile_id: string;
        };
        Returns: string;
      };
      replace_my_interests: {
        Args: { selected_interest_ids: number[] };
        Returns: undefined;
      };
      respond_friend_request: {
        Args: {
          accept_request: boolean;
          target_request_id: string;
        };
        Returns: undefined;
      };
      search_profiles: {
        Args: {
          result_limit?: number;
          search_term: string;
        };
        Returns: Array<{
          allow_friend_requests: boolean;
          avatar_path: null | string;
          bio: null | string;
          display_name: string;
          handle: string;
          mutual_friend_count: number;
          profile_id: string;
          relationship_status: string;
        }>;
      };
      send_friend_request: {
        Args: { target_profile_id: string };
        Returns: string;
      };
      set_my_presence: {
        Args: { next_status: string };
        Returns: undefined;
      };
      set_profile_interests: {
        Args: {
          category_slug: string;
          selected_interest_ids: number[];
        };
        Returns: undefined;
      };
      unblock_profile: {
        Args: { target_profile_id: string };
        Returns: undefined;
      };
    };
    Tables: {
      connection_notifications: {
        Insert: {
          actor_id: string;
          created_at?: string;
          friend_request_id?: null | string;
          notification_type: string;
          read_at?: null | string;
          recipient_id: string;
        };
        Relationships: [
          {
            columns: ['actor_id'];
            foreignKeyName: 'connection_notifications_actor_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['friend_request_id'];
            foreignKeyName: 'connection_notifications_friend_request_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'friend_requests';
          },
          {
            columns: ['recipient_id'];
            foreignKeyName: 'connection_notifications_recipient_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          actor_id: string;
          created_at: string;
          friend_request_id: null | string;
          id: number;
          notification_type: string;
          read_at: null | string;
          recipient_id: string;
        };
        Update: {
          read_at?: null | string;
        };
      };
      dismissed_friend_suggestions: {
        Insert: {
          created_at?: string;
          hidden_until?: null | string;
          profile_id: string;
          suggested_profile_id: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['profile_id'];
            foreignKeyName: 'dismissed_friend_suggestions_profile_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['suggested_profile_id'];
            foreignKeyName: 'dismissed_friend_suggestions_suggested_profile_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          created_at: string;
          hidden_until: null | string;
          profile_id: string;
          suggested_profile_id: string;
          updated_at: string;
        };
        Update: {
          hidden_until?: null | string;
          updated_at?: string;
        };
      };
      friend_requests: {
        Insert: {
          created_at?: string;
          id?: string;
          receiver_id: string;
          sender_id: string;
        };
        Relationships: [
          {
            columns: ['receiver_id'];
            foreignKeyName: 'friend_requests_receiver_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['sender_id'];
            foreignKeyName: 'friend_requests_sender_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          created_at: string;
          id: string;
          receiver_id: string;
          sender_id: string;
        };
        Update: Record<never, never>;
      };
      friendships: {
        Insert: {
          created_at?: string;
          user_high_id: string;
          user_low_id: string;
        };
        Relationships: [
          {
            columns: ['user_high_id'];
            foreignKeyName: 'friendships_user_high_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['user_low_id'];
            foreignKeyName: 'friendships_user_low_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          created_at: string;
          user_high_id: string;
          user_low_id: string;
        };
        Update: Record<never, never>;
      };
      interest_categories: {
        Insert: {
          description: string;
          label: string;
          slug: string;
          sort_order: number;
        };
        Relationships: [];
        Row: {
          description: string;
          id: number;
          label: string;
          slug: string;
          sort_order: number;
        };
        Update: {
          description?: string;
          label?: string;
          slug?: string;
          sort_order?: number;
        };
      };
      interests: {
        Insert: {
          category_id: number;
          label: string;
          slug: string;
          sort_order: number;
        };
        Relationships: [
          {
            columns: ['category_id'];
            foreignKeyName: 'interests_category_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'interest_categories';
          },
        ];
        Row: {
          category_id: number;
          id: number;
          label: string;
          slug: string;
          sort_order: number;
        };
        Update: {
          category_id?: number;
          label?: string;
          slug?: string;
          sort_order?: number;
        };
      };
      profile_interests: {
        Insert: {
          created_at?: string;
          interest_id: number;
          profile_id: string;
        };
        Relationships: [
          {
            columns: ['interest_id'];
            foreignKeyName: 'profile_interests_interest_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'interests';
          },
          {
            columns: ['profile_id'];
            foreignKeyName: 'profile_interests_profile_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          created_at: string;
          interest_id: number;
          profile_id: string;
        };
        Update: Record<never, never>;
      };
      profile_settings: {
        Insert: {
          allow_direct_messages?: boolean;
          allow_friend_requests?: boolean;
          created_at?: string;
          discoverable_by_search?: boolean;
          hide_all_interests?: boolean;
          onboarding_completed_at?: null | string;
          onboarding_step?: number;
          profile_id: string;
          show_interests_on_profile?: boolean;
          show_mutual_friends?: boolean;
          show_mutual_servers?: boolean;
          show_online_status?: boolean;
          updated_at?: string;
          use_interests_for_suggestions?: boolean;
        };
        Relationships: [
          {
            columns: ['profile_id'];
            foreignKeyName: 'profile_settings_profile_id_fkey';
            isOneToOne: true;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          allow_direct_messages: boolean;
          allow_friend_requests: boolean;
          created_at: string;
          discoverable_by_search: boolean;
          hide_all_interests: boolean;
          onboarding_completed_at: null | string;
          onboarding_step: number;
          profile_id: string;
          show_interests_on_profile: boolean;
          show_mutual_friends: boolean;
          show_mutual_servers: boolean;
          show_online_status: boolean;
          updated_at: string;
          use_interests_for_suggestions: boolean;
        };
        Update: {
          allow_direct_messages?: boolean;
          allow_friend_requests?: boolean;
          discoverable_by_search?: boolean;
          hide_all_interests?: boolean;
          onboarding_completed_at?: null | string;
          onboarding_step?: number;
          show_interests_on_profile?: boolean;
          show_mutual_friends?: boolean;
          show_mutual_servers?: boolean;
          show_online_status?: boolean;
          updated_at?: string;
          use_interests_for_suggestions?: boolean;
        };
      };
      profiles: {
        Insert: {
          avatar_path?: null | string;
          bio?: null | string;
          created_at?: string;
          display_name: string;
          favorite_spotify_thumbnail_url?: null | string;
          favorite_spotify_title?: null | string;
          favorite_spotify_url?: null | string;
          handle: string;
          id: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['id'];
            foreignKeyName: 'profiles_id_fkey';
            isOneToOne: true;
            referencedColumns: ['id'];
            referencedRelation: 'users';
          },
        ];
        Row: {
          avatar_path: null | string;
          bio: null | string;
          created_at: string;
          display_name: string;
          favorite_spotify_thumbnail_url: null | string;
          favorite_spotify_title: null | string;
          favorite_spotify_url: null | string;
          handle: string;
          id: string;
          updated_at: string;
        };
        Update: {
          avatar_path?: null | string;
          bio?: null | string;
          display_name?: string;
          favorite_spotify_thumbnail_url?: null | string;
          favorite_spotify_title?: null | string;
          favorite_spotify_url?: null | string;
          handle?: string;
          updated_at?: string;
        };
      };
      user_blocks: {
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Relationships: [
          {
            columns: ['blocked_id'];
            foreignKeyName: 'user_blocks_blocked_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['blocker_id'];
            foreignKeyName: 'user_blocks_blocker_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Update: Record<never, never>;
      };
      user_presence: {
        Insert: {
          last_seen_at?: string;
          profile_id: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['profile_id'];
            foreignKeyName: 'user_presence_profile_id_fkey';
            isOneToOne: true;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          last_seen_at: string;
          profile_id: string;
          status: string;
          updated_at: string;
        };
        Update: {
          last_seen_at?: string;
          status?: string;
          updated_at?: string;
        };
      };
      user_reports: {
        Insert: {
          created_at?: string;
          details?: null | string;
          id?: string;
          reason: string;
          reported_profile_id: string;
          reporter_id: string;
          status?: string;
        };
        Relationships: [
          {
            columns: ['reported_profile_id'];
            foreignKeyName: 'user_reports_reported_profile_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['reporter_id'];
            foreignKeyName: 'user_reports_reporter_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          created_at: string;
          details: null | string;
          id: string;
          reason: string;
          reported_profile_id: string;
          reporter_id: string;
          status: string;
        };
        Update: {
          details?: null | string;
          status?: string;
        };
      };
    };
    Views: Record<never, never>;
  };
};
