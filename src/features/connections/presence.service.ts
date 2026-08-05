import { getSupabaseClient } from '../../lib/supabase/client';
import {
  normalizePresenceMode,
  normalizePresenceStatus,
  type PresencePreferences,
  type SavePresencePreferenceInput,
} from './presence.types';

type RpcError = {
  message?: string;
};

type RpcResult<T> = {
  data: T | null;
  error: null | RpcError;
};

type UnsafeRpc = (
  functionName: string,
  args?: Record<string, unknown>,
) => Promise<RpcResult<unknown>>;

async function callPresenceRpc<T>(
  functionName: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const client = getSupabaseClient() as unknown as { rpc: UnsafeRpc };
  const { data, error } = await client.rpc(functionName, args);

  if (error) {
    throw new Error(error.message ?? 'Não foi possível atualizar sua presença.');
  }

  return data as T;
}

function toPresencePreferences(value: unknown): PresencePreferences {
  const row =
    Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === 'object'
      ? (value[0] as Record<string, unknown>)
      : {};

  return {
    customStatus: typeof row.custom_status === 'string' ? row.custom_status : null,
    customStatusExpiresAt:
      typeof row.custom_status_expires_at === 'string' ? row.custom_status_expires_at : null,
    mode: normalizePresenceMode(row.presence_mode),
    status: normalizePresenceStatus(row.status),
  };
}

export async function fetchMyPresencePreferences(): Promise<PresencePreferences> {
  return toPresencePreferences(await callPresenceRpc<unknown>('get_my_presence_preferences'));
}

export async function saveMyPresencePreference(input: SavePresencePreferenceInput) {
  const customStatus = input.customStatus.trim();

  await callPresenceRpc('set_my_presence_preference', {
    custom_status_duration_minutes: customStatus ? input.durationMinutes : null,
    next_custom_status: customStatus || null,
    next_mode: input.mode,
  });
}

export async function heartbeatMyPresence(appIsActive: boolean) {
  await callPresenceRpc('heartbeat_my_presence', {
    app_is_active: appIsActive,
  });
}
