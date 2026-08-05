import { getSupabaseClient } from '../../lib/supabase/client';
import { toServerActionError } from './servers.errors';
import type { ServerArcanaStatus, ServerCircleLevel } from './serverArcana.types';

type UnknownRecord = Record<string, unknown>;

type RpcResult = {
  data: unknown;
  error: null | unknown;
};

type UntypedRpc = (functionName: string, args?: Record<string, unknown>) => Promise<RpcResult>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numericValue(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function circleLevel(value: unknown): ServerCircleLevel {
  const parsed = numericValue(value);

  if (parsed === 1 || parsed === 2 || parsed === 3) {
    return parsed;
  }

  return 0;
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeStatus(value: unknown): ServerArcanaStatus | null {
  const row = isRecord(value) ? value : null;

  if (!row || typeof row.server_id !== 'string') {
    return null;
  }

  return {
    animated_media_unlocked: row.animated_media_unlocked === true,
    attachment_limit_bytes: numericValue(row.attachment_limit_bytes, 5 * 1024 * 1024),
    circle_color: typeof row.circle_color === 'string' ? row.circle_color : '#64748B',
    circle_level: circleLevel(row.circle_level),
    circle_name: typeof row.circle_name === 'string' ? row.circle_name : 'Sem Círculo',
    contributor_count: numericValue(row.contributor_count),
    current_threshold: numericValue(row.current_threshold),
    custom_gradient_unlocked: row.custom_gradient_unlocked === true,
    gradient_angle: numericValue(row.gradient_angle, 135),
    gradient_end: nullableString(row.gradient_end),
    gradient_start: nullableString(row.gradient_start),
    next_level_runes:
      row.next_level_runes === null || row.next_level_runes === undefined
        ? null
        : numericValue(row.next_level_runes),
    rune_count: numericValue(row.rune_count),
    runes_to_next_level: numericValue(row.runes_to_next_level),
    server_id: row.server_id,
  };
}

function rpcClient() {
  return getSupabaseClient() as unknown as {
    rpc: UntypedRpc;
  };
}

export async function fetchServerArcanaStatus(serverId: string) {
  const { data, error } = await rpcClient().rpc('get_server_arcana_status', {
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return normalizeStatus(row);
}

export async function fetchMyServerArcanaStatuses() {
  const { data, error } = await rpcClient().rpc('get_my_server_arcana_statuses');

  if (error) {
    throw toServerActionError(error);
  }

  return Array.isArray(data)
    ? data.map(normalizeStatus).filter((status): status is ServerArcanaStatus => Boolean(status))
    : [];
}

export async function saveServerArcanaGradient(
  serverId: string,
  start: string,
  end: string,
  angle: number,
) {
  const { error } = await rpcClient().rpc('set_server_arcana_gradient', {
    gradient_angle: angle,
    gradient_end: end,
    gradient_start: start,
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }
}

export async function clearServerArcanaGradient(serverId: string) {
  const { error } = await rpcClient().rpc('clear_server_arcana_gradient', {
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }
}
