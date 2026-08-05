import { getSupabaseClient } from '../../lib/supabase/client';
import type { GlobalSearchInput, GlobalSearchResult } from './globalSearch.types';

const pageSize = 30;

type UnknownRow = Record<string, unknown>;

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeResult(value: unknown): GlobalSearchResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as UnknownRow;
  const resultKind =
    row.result_kind === 'direct' || row.result_kind === 'server' ? row.result_kind : null;
  const messageId = nullableString(row.message_id);

  if (!resultKind || !messageId) {
    return null;
  }

  return {
    attachment_count: numberValue(row.attachment_count),
    attachment_name: nullableString(row.attachment_name),
    author_avatar_path: nullableString(row.author_avatar_path),
    author_display_name: stringValue(row.author_display_name, 'Conta removida'),
    author_handle: stringValue(row.author_handle, 'conta_removida'),
    author_id: nullableString(row.author_id),
    channel_id: nullableString(row.channel_id),
    conversation_id: nullableString(row.conversation_id),
    created_at: stringValue(row.created_at),
    message_content: nullableString(row.message_content),
    message_id: messageId,
    place_name: stringValue(row.place_name, 'Conversa'),
    relevance: numberValue(row.relevance),
    result_kind: resultKind,
    secondary_place_name: stringValue(row.secondary_place_name),
    server_id: nullableString(row.server_id),
  };
}

export async function searchGlobalMessages(input: GlobalSearchInput, offset: number) {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: null | {
        message?: string;
      };
    }>;
  };
  const { data, error } = await client.rpc('search_my_message_history', {
    result_limit: pageSize,
    result_offset: offset,
    search_order: input.order,
    search_scope: input.scope,
    search_text: input.query.trim(),
    target_server_id: input.serverId || null,
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível pesquisar o histórico.');
  }

  return Array.isArray(data)
    ? data.map(normalizeResult).filter((result): result is GlobalSearchResult => Boolean(result))
    : [];
}

export const globalSearchPageSize = pageSize;
