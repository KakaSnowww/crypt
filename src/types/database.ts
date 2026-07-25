export type Json = boolean | null | number | string | Json[] | { [key: string]: Json | undefined };

export type Database = {
  public: {
    CompositeTypes: Record<never, never>;
    Enums: Record<never, never>;
    Functions: {
      can_view_profile_interests: {
        Args: {
          target_profile_id: string;
        };
        Returns: boolean;
      };
      is_handle_available: {
        Args: {
          candidate_handle: string;
        };
        Returns: boolean;
      };
      replace_my_interests: {
        Args: {
          selected_interest_ids: number[];
        };
        Returns: undefined;
      };
      set_profile_interests: {
        Args: {
          category_slug: string;
          selected_interest_ids: number[];
        };
        Returns: undefined;
      };
    };
    Tables: {
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
    };
    Views: Record<never, never>;
  };
};
