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
      ban_server_member: {
        Args: {
          moderation_reason?: null | string;
          target_profile_id: string;
          target_server_id: string;
        };
        Returns: undefined;
      };
      can_moderate_server_member: {
        Args: { target_profile_id: string; target_server_id: string };
        Returns: boolean;
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
      create_server: {
        Args: {
          server_description?: null | string;
          server_name: string;
        };
        Returns: string;
      };
      create_server_invite: {
        Args: {
          expires_in_hours?: null | number;
          invite_max_uses?: null | number;
          target_server_id: string;
        };
        Returns: string;
      };
      create_server_category: {
        Args: { category_name: string; target_server_id: string };
        Returns: string;
      };
      create_server_channel: {
        Args: {
          channel_icon?: null | string;
          channel_is_read_only?: boolean;
          channel_name: string;
          channel_slowmode_seconds?: number;
          channel_topic?: null | string;
          target_category_id?: null | string;
          target_server_id: string;
        };
        Returns: string;
      };
      create_server_role: {
        Args: {
          role_color: string;
          role_display_separately?: boolean;
          role_name: string;
          role_permissions: number;
          target_server_id: string;
        };
        Returns: string;
      };
      delete_channel_message: {
        Args: { target_message_id: string };
        Returns: string[];
      };
      delete_direct_message: {
        Args: { target_message_id: string };
        Returns: string[];
      };
      delete_server: {
        Args: {
          confirmation_name: string;
          target_server_id: string;
        };
        Returns: undefined;
      };
      delete_server_category: {
        Args: { target_category_id: string };
        Returns: undefined;
      };
      delete_server_channel: {
        Args: { target_channel_id: string };
        Returns: undefined;
      };
      delete_server_permission_override: {
        Args: { target_override_id: string };
        Returns: undefined;
      };
      delete_server_role: {
        Args: { target_role_id: string };
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
      get_channel_messages: {
        Args: {
          before_created_at?: null | string;
          before_message_id?: null | string;
          result_limit?: number;
          target_channel_id: string;
        };
        Returns: Array<{
          attachment_summary: Json;
          author_avatar_path: null | string;
          author_display_name: string;
          author_handle: string;
          author_id: null | string;
          can_delete: boolean;
          can_edit: boolean;
          can_pin: boolean;
          channel_id: string;
          content: null | string;
          created_at: string;
          deleted_at: null | string;
          edited_at: null | string;
          mentioned_channel_ids: string[];
          mentioned_profile_ids: string[];
          message_id: string;
          pinned_at: null | string;
          reaction_summary: Json;
          reply_author_display_name: null | string;
          reply_content: null | string;
          reply_to_id: null | string;
          server_id: string;
        }>;
      };
      get_direct_messages: {
        Args: {
          before_created_at?: null | string;
          before_message_id?: null | string;
          result_limit?: number;
          target_conversation_id: string;
        };
        Returns: Array<{
          attachment_summary: Json;
          author_avatar_path: null | string;
          author_display_name: string;
          author_handle: string;
          author_id: null | string;
          can_delete: boolean;
          can_edit: boolean;
          content: null | string;
          conversation_id: string;
          created_at: string;
          deleted_at: null | string;
          edited_at: null | string;
          message_id: string;
          reaction_summary: Json;
          reply_author_display_name: null | string;
          reply_content: null | string;
          reply_to_id: null | string;
        }>;
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
      get_my_direct_conversations: {
        Args: NoArgs;
        Returns: Array<{
          conversation_id: string;
          is_blocked: boolean;
          is_online: boolean;
          last_message_at: string;
          last_message_author_id: null | string;
          last_message_preview: string;
          other_avatar_path: null | string;
          other_display_name: string;
          other_handle: string;
          other_profile_id: string;
          unread_count: number;
        }>;
      };
      get_my_servers: {
        Args: NoArgs;
        Returns: Array<{
          banner_path: null | string;
          created_at: string;
          default_channel_id: null | string;
          default_channel_name: null | string;
          icon_path: null | string;
          is_owner: boolean;
          joined_at: string;
          member_count: number;
          owner_id: string;
          server_description: null | string;
          server_id: string;
          server_name: string;
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
      get_server_invite_preview: {
        Args: { invite_code: string };
        Returns: Array<{
          already_member: boolean;
          banner_path: null | string;
          expires_at: null | string;
          icon_path: null | string;
          member_count: number;
          owner_display_name: string;
          remaining_uses: null | number;
          server_description: null | string;
          server_id: string;
          server_name: string;
        }>;
      };
      get_server_invites: {
        Args: { target_server_id: string };
        Returns: Array<{
          created_at: string;
          created_by: string;
          creator_display_name: string;
          creator_handle: string;
          expires_at: null | string;
          invite_code: string;
          invite_id: string;
          max_uses: null | number;
          uses_count: number;
        }>;
      };
      get_my_server_permissions: {
        Args: { target_server_id: string };
        Returns: number;
      };
      get_server_categories: {
        Args: { target_server_id: string };
        Returns: Array<{
          category_id: string;
          category_name: string;
          category_position: number;
          created_at: string;
        }>;
      };
      get_server_channels: {
        Args: { target_server_id: string };
        Returns: Array<{
          category_id: null | string;
          channel_icon: null | string;
          channel_id: string;
          channel_name: string;
          channel_position: number;
          created_at: string;
          effective_permissions: number;
          is_read_only: boolean;
          normalized_name: string;
          slowmode_seconds: number;
          topic: null | string;
        }>;
      };
      get_server_member_roles: {
        Args: { target_server_id: string };
        Returns: Array<{ profile_id: string; role_ids: string[] }>;
      };
      get_server_audit_logs: {
        Args: { result_limit?: number; target_server_id: string };
        Returns: Array<{
          action: string;
          actor_display_name: null | string;
          actor_handle: null | string;
          audit_id: number;
          created_at: string;
          metadata: Json;
          reason: null | string;
          target_display_name: null | string;
          target_handle: null | string;
        }>;
      };
      get_server_bans: {
        Args: { target_server_id: string };
        Returns: Array<{
          avatar_path: null | string;
          banned_by_display_name: null | string;
          created_at: string;
          display_name: string;
          handle: string;
          profile_id: string;
          reason: null | string;
        }>;
      };
      get_server_moderation_settings: {
        Args: { target_server_id: string };
        Returns: Array<{
          allow_member_reports: boolean;
          notify_moderators_on_report: boolean;
          require_ban_reason: boolean;
          updated_at: string;
        }>;
      };
      get_server_reports: {
        Args: { report_status?: string; target_server_id: string };
        Returns: Array<{
          created_at: string;
          details: null | string;
          reason: string;
          report_id: string;
          reported_display_name: string;
          reported_handle: string;
          reported_profile_id: string;
          reporter_display_name: string;
          reporter_handle: string;
          resolution_note: null | string;
          resolved_at: null | string;
          status: string;
        }>;
      };
      get_server_message_attachment_paths: {
        Args: { target_server_id: string };
        Returns: string[];
      };
      get_server_members: {
        Args: { target_server_id: string };
        Returns: Array<{
          avatar_path: null | string;
          display_name: string;
          handle: string;
          is_online: boolean;
          is_owner: boolean;
          joined_at: string;
          presence_status: string;
          profile_id: string;
        }>;
      };
      get_server_overview: {
        Args: { target_server_id: string };
        Returns: Array<{
          banner_path: null | string;
          created_at: string;
          default_channel_id: null | string;
          default_channel_name: null | string;
          icon_path: null | string;
          is_owner: boolean;
          is_private: boolean;
          member_count: number;
          owner_display_name: string;
          owner_handle: string;
          owner_id: string;
          server_description: null | string;
          server_id: string;
          server_name: string;
          updated_at: string;
        }>;
      };
      get_server_permission_overrides: {
        Args: { target_server_id: string };
        Returns: Array<{
          allow_permissions: number;
          category_id: null | string;
          channel_id: null | string;
          deny_permissions: number;
          override_id: string;
          profile_id: null | string;
          role_id: null | string;
        }>;
      };
      get_server_roles: {
        Args: { target_server_id: string };
        Returns: Array<{
          color: string;
          display_separately: boolean;
          is_default: boolean;
          is_system: boolean;
          member_count: number;
          permissions: number;
          role_id: string;
          role_name: string;
          role_position: number;
        }>;
      };
      get_server_unread_counts: {
        Args: { target_server_id: string };
        Returns: Array<{
          channel_id: string;
          mention_count: number;
          unread_count: number;
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
      is_server_member: {
        Args: { target_server_id: string };
        Returns: boolean;
      };
      is_server_owner: {
        Args: { target_server_id: string };
        Returns: boolean;
      };
      join_server_by_invite: {
        Args: { invite_code: string };
        Returns: string;
      };
      leave_server: {
        Args: { target_server_id: string };
        Returns: undefined;
      };
      mark_connection_notifications_read: {
        Args: NoArgs;
        Returns: undefined;
      };
      kick_server_member: {
        Args: {
          moderation_reason?: null | string;
          target_profile_id: string;
          target_server_id: string;
        };
        Returns: undefined;
      };
      mark_channel_read: {
        Args: {
          target_channel_id: string;
          target_message_id?: null | string;
        };
        Returns: undefined;
      };
      mark_direct_conversation_read: {
        Args: { target_conversation_id: string };
        Returns: undefined;
      };
      move_server_category: {
        Args: { direction: number; target_category_id: string };
        Returns: undefined;
      };
      move_server_channel: {
        Args: { direction: number; target_channel_id: string };
        Returns: undefined;
      };
      move_server_role: {
        Args: { direction: number; target_role_id: string };
        Returns: undefined;
      };
      normalize_server_name: {
        Args: { input_value: string };
        Returns: string;
      };
      open_direct_conversation: {
        Args: { target_profile_id: string };
        Returns: string;
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
      report_server_member: {
        Args: {
          report_details?: null | string;
          report_reason: string;
          target_profile_id: string;
          target_server_id: string;
        };
        Returns: string;
      };
      resolve_server_report: {
        Args: {
          resolution_details?: null | string;
          resolution_status: string;
          target_report_id: string;
        };
        Returns: undefined;
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
      revoke_server_invite: {
        Args: { target_invite_id: string };
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
      send_channel_message: {
        Args: {
          attachment_items?: Json;
          mentioned_channel_ids?: string[];
          mentioned_profile_ids?: string[];
          message_content: string;
          target_channel_id: string;
          target_reply_id?: null | string;
        };
        Returns: string;
      };
      send_direct_message: {
        Args: {
          attachment_items?: Json;
          message_content: string;
          target_conversation_id: string;
          target_reply_id?: null | string;
        };
        Returns: string;
      };
      set_server_member_roles: {
        Args: {
          target_profile_id: string;
          target_role_ids: string[];
          target_server_id: string;
        };
        Returns: undefined;
      };
      set_server_permission_override: {
        Args: {
          allowed_permissions: number;
          denied_permissions: number;
          target_id: string;
          target_kind: string;
          target_role_id: string;
          target_server_id: string;
        };
        Returns: string;
      };
      set_my_presence: {
        Args: { next_status: string };
        Returns: undefined;
      };
      hide_direct_conversation: {
        Args: { target_conversation_id: string };
        Returns: undefined;
      };
      set_profile_interests: {
        Args: {
          category_slug: string;
          selected_interest_ids: number[];
        };
        Returns: undefined;
      };
      transfer_server_ownership: {
        Args: {
          new_owner_profile_id: string;
          target_server_id: string;
        };
        Returns: undefined;
      };
      toggle_message_reaction: {
        Args: { reaction_emoji: string; target_message_id: string };
        Returns: boolean;
      };
      toggle_direct_message_reaction: {
        Args: { reaction_emoji: string; target_message_id: string };
        Returns: boolean;
      };
      toggle_pin_channel_message: {
        Args: { target_message_id: string };
        Returns: boolean;
      };
      unblock_profile: {
        Args: { target_profile_id: string };
        Returns: undefined;
      };
      unban_server_member: {
        Args: {
          moderation_reason?: null | string;
          target_profile_id: string;
          target_server_id: string;
        };
        Returns: undefined;
      };
      update_server_moderation_settings: {
        Args: {
          ban_reason_required: boolean;
          report_notifications_enabled: boolean;
          reports_enabled: boolean;
          target_server_id: string;
        };
        Returns: undefined;
      };
      update_server_settings: {
        Args: {
          server_banner_path?: null | string;
          server_description?: null | string;
          server_icon_path?: null | string;
          server_name: string;
          target_server_id: string;
        };
        Returns: undefined;
      };
      update_server_category: {
        Args: { category_name: string; target_category_id: string };
        Returns: undefined;
      };
      update_server_channel: {
        Args: {
          channel_icon?: null | string;
          channel_is_read_only?: boolean;
          channel_name: string;
          channel_slowmode_seconds?: number;
          channel_topic?: null | string;
          target_category_id: null | string;
          target_channel_id: string;
        };
        Returns: undefined;
      };
      update_server_role: {
        Args: {
          role_color: string;
          role_display_separately?: boolean;
          role_name: string;
          role_permissions: number;
          target_role_id: string;
        };
        Returns: undefined;
      };
      edit_direct_message: {
        Args: { new_content: string; target_message_id: string };
        Returns: undefined;
      };
      edit_channel_message: {
        Args: { new_content: string; target_message_id: string };
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
          direct_message_policy?: 'anyone' | 'friends' | 'none' | 'shared_servers';
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
          direct_message_policy: 'anyone' | 'friends' | 'none' | 'shared_servers';
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
          direct_message_policy?: 'anyone' | 'friends' | 'none' | 'shared_servers';
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
      server_bans: {
        Insert: {
          banned_by?: null | string;
          created_at?: string;
          profile_id: string;
          reason?: null | string;
          server_id: string;
        };
        Relationships: [
          {
            columns: ['server_id'];
            foreignKeyName: 'server_bans_server_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'servers';
          },
          {
            columns: ['profile_id'];
            foreignKeyName: 'server_bans_profile_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
          {
            columns: ['banned_by'];
            foreignKeyName: 'server_bans_banned_by_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          banned_by: null | string;
          created_at: string;
          profile_id: string;
          reason: null | string;
          server_id: string;
        };
        Update: {
          reason?: null | string;
        };
      };
      server_channels: {
        Insert: {
          channel_type?: string;
          created_at?: string;
          created_by?: null | string;
          id?: string;
          name: string;
          normalized_name: string;
          position?: number;
          server_id: string;
        };
        Relationships: [
          {
            columns: ['server_id'];
            foreignKeyName: 'server_channels_server_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'servers';
          },
          {
            columns: ['created_by'];
            foreignKeyName: 'server_channels_created_by_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          channel_type: string;
          created_at: string;
          created_by: null | string;
          id: string;
          name: string;
          normalized_name: string;
          position: number;
          server_id: string;
        };
        Update: Record<never, never>;
      };
      server_invites: {
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          expires_at?: null | string;
          id?: string;
          max_uses?: null | number;
          revoked_at?: null | string;
          server_id: string;
          uses_count?: number;
        };
        Relationships: [
          {
            columns: ['server_id'];
            foreignKeyName: 'server_invites_server_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'servers';
          },
          {
            columns: ['created_by'];
            foreignKeyName: 'server_invites_created_by_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: null | string;
          id: string;
          max_uses: null | number;
          revoked_at: null | string;
          server_id: string;
          uses_count: number;
        };
        Update: {
          revoked_at?: null | string;
          uses_count?: number;
        };
      };
      server_members: {
        Insert: {
          joined_at?: string;
          profile_id: string;
          server_id: string;
        };
        Relationships: [
          {
            columns: ['server_id'];
            foreignKeyName: 'server_members_server_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'servers';
          },
          {
            columns: ['profile_id'];
            foreignKeyName: 'server_members_profile_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          joined_at: string;
          profile_id: string;
          server_id: string;
        };
        Update: Record<never, never>;
      };
      server_roles: {
        Insert: {
          color?: null | string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          is_system?: boolean;
          name: string;
          position?: number;
          server_id: string;
        };
        Relationships: [
          {
            columns: ['server_id'];
            foreignKeyName: 'server_roles_server_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'servers';
          },
        ];
        Row: {
          color: null | string;
          created_at: string;
          id: string;
          is_default: boolean;
          is_system: boolean;
          name: string;
          position: number;
          server_id: string;
        };
        Update: Record<never, never>;
      };
      servers: {
        Insert: {
          banner_path?: null | string;
          created_at?: string;
          description?: null | string;
          icon_path?: null | string;
          id?: string;
          is_private?: boolean;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ['owner_id'];
            foreignKeyName: 'servers_owner_id_fkey';
            isOneToOne: false;
            referencedColumns: ['id'];
            referencedRelation: 'profiles';
          },
        ];
        Row: {
          banner_path: null | string;
          created_at: string;
          description: null | string;
          icon_path: null | string;
          id: string;
          is_private: boolean;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Update: {
          banner_path?: null | string;
          description?: null | string;
          icon_path?: null | string;
          name?: string;
          owner_id?: string;
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
