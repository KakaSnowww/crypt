import { getSupabaseClient } from '../../lib/supabase/client';
import { toModerationError } from './moderation.errors';
import type { ServerAutoModEvent, ServerAutoModSettings } from './automod.types';

type RpcResponse = {
  data: unknown;
  error: null | unknown;
};

type UntypedRpc = (name: string, args?: Record<string, unknown>) => Promise<RpcResponse>;

function rpcClient() {
  return getSupabaseClient() as unknown as {
    rpc: UntypedRpc;
  };
}

function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function settingsRow(value: unknown): ServerAutoModSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;

  return {
    block_duplicates: row.block_duplicates !== false,
    block_external_links: row.block_external_links === true,
    block_invite_links: row.block_invite_links === true,
    block_spam: row.block_spam !== false,
    blocked_terms: Array.isArray(row.blocked_terms)
      ? row.blocked_terms.filter((term): term is string => typeof term === 'string')
      : [],
    duplicate_window_seconds: numberValue(row.duplicate_window_seconds, 30),
    enabled: row.enabled === true,
    interval_seconds: numberValue(row.interval_seconds, 10),
    max_mentions: numberValue(row.max_mentions, 8),
    max_messages: numberValue(row.max_messages, 5),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
}

function eventRow(value: unknown): ServerAutoModEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const rule = row.rule_code;

  if (
    rule !== 'blocked_term' &&
    rule !== 'duplicate_message' &&
    rule !== 'external_link' &&
    rule !== 'invite_link' &&
    rule !== 'mention_limit' &&
    rule !== 'spam_burst'
  ) {
    return null;
  }

  return {
    channel_id: typeof row.channel_id === 'string' ? row.channel_id : null,
    channel_name: typeof row.channel_name === 'string' ? row.channel_name : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    event_id: numberValue(row.event_id, 0),
    message_excerpt: typeof row.message_excerpt === 'string' ? row.message_excerpt : null,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    profile_avatar_path:
      typeof row.profile_avatar_path === 'string' ? row.profile_avatar_path : null,
    profile_display_name:
      typeof row.profile_display_name === 'string' ? row.profile_display_name : 'Conta removida',
    profile_handle: typeof row.profile_handle === 'string' ? row.profile_handle : 'conta_removida',
    profile_id: typeof row.profile_id === 'string' ? row.profile_id : null,
    rule_code: rule,
  };
}

export async function fetchServerAutoModSettings(serverId: string) {
  const { data, error } = await rpcClient().rpc('get_server_automod_settings', {
    target_server_id: serverId,
  });

  if (error) {
    throw toModerationError(error);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return settingsRow(row);
}

export async function fetchServerAutoModEvents(serverId: string) {
  const { data, error } = await rpcClient().rpc('get_server_automod_events', {
    result_limit: 100,
    target_server_id: serverId,
  });

  if (error) {
    throw toModerationError(error);
  }

  return Array.isArray(data)
    ? data.map(eventRow).filter((event): event is ServerAutoModEvent => Boolean(event))
    : [];
}

export async function saveServerAutoModSettings(
  serverId: string,
  settings: Omit<ServerAutoModSettings, 'updated_at'>,
) {
  const { error } = await rpcClient().rpc('update_server_automod_settings', {
    automod_enabled: settings.enabled,
    duplicates_enabled: settings.block_duplicates,
    duplicates_window_seconds: settings.duplicate_window_seconds,
    external_links_blocked: settings.block_external_links,
    invite_links_blocked: settings.block_invite_links,
    mention_limit: settings.max_mentions,
    spam_enabled: settings.block_spam,
    spam_interval_seconds: settings.interval_seconds,
    spam_max_messages: settings.max_messages,
    target_server_id: serverId,
    terms: settings.blocked_terms,
  });

  if (error) {
    throw toModerationError(error);
  }
}
