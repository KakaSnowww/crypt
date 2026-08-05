export type AutoModRuleCode =
  | 'blocked_term'
  | 'duplicate_message'
  | 'external_link'
  | 'invite_link'
  | 'mention_limit'
  | 'spam_burst';

export type ServerAutoModSettings = {
  block_duplicates: boolean;
  block_external_links: boolean;
  block_invite_links: boolean;
  block_spam: boolean;
  blocked_terms: string[];
  duplicate_window_seconds: number;
  enabled: boolean;
  interval_seconds: number;
  max_mentions: number;
  max_messages: number;
  updated_at: string;
};

export type ServerAutoModEvent = {
  channel_id: null | string;
  channel_name: null | string;
  created_at: string;
  event_id: number;
  message_excerpt: null | string;
  metadata: Record<string, unknown>;
  profile_avatar_path: null | string;
  profile_display_name: string;
  profile_handle: string;
  profile_id: null | string;
  rule_code: AutoModRuleCode;
};

export const autoModRuleLabels: Record<AutoModRuleCode, string> = {
  blocked_term: 'Termo bloqueado',
  duplicate_message: 'Mensagem repetida',
  external_link: 'Link externo',
  invite_link: 'Link de convite',
  mention_limit: 'Excesso de menções',
  spam_burst: 'Spam em rajada',
};
