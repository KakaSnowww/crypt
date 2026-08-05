export type GlobalSearchScope = 'all' | 'direct' | 'servers';

export type GlobalSearchOrder = 'recent' | 'relevance';

export type GlobalSearchResult = {
  attachment_count: number;
  attachment_name: null | string;
  author_avatar_path: null | string;
  author_display_name: string;
  author_handle: string;
  author_id: null | string;
  channel_id: null | string;
  conversation_id: null | string;
  created_at: string;
  message_content: null | string;
  message_id: string;
  place_name: string;
  relevance: number;
  result_kind: 'direct' | 'server';
  secondary_place_name: string;
  server_id: null | string;
};

export type GlobalSearchInput = {
  order: GlobalSearchOrder;
  query: string;
  scope: GlobalSearchScope;
  serverId: null | string;
};
