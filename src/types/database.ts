export type Json = boolean | null | number | string | Json[] | { [key: string]: Json | undefined };

export type Database = {
  public: {
    CompositeTypes: Record<never, never>;
    Enums: Record<never, never>;
    Functions: {
      is_handle_available: {
        Args: {
          candidate_handle: string;
        };
        Returns: boolean;
      };
    };
    Tables: {
      profiles: {
        Insert: {
          avatar_url?: null | string;
          bio?: null | string;
          created_at?: string;
          display_name: string;
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
          avatar_url: null | string;
          bio: null | string;
          created_at: string;
          display_name: string;
          handle: string;
          id: string;
          updated_at: string;
        };
        Update: {
          avatar_url?: null | string;
          bio?: null | string;
          display_name?: string;
          handle?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<never, never>;
  };
};
