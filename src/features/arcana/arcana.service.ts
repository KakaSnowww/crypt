import { getSupabaseClient } from '../../lib/supabase/client';
import { toProfileActionError } from '../profile/profile.errors';
import type { ArcanaMembership, ArcanaMembershipStatus } from './arcana.types';

type UnknownRecord = Record<string, unknown>;

type RpcResult<T> = {
  data: T | null;
  error: null | { message?: string };
};

type UntypedRpc = (
  functionName: string,
  args?: Record<string, unknown>,
) => Promise<RpcResult<unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nullableString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function numericValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function membershipStatus(value: unknown): ArcanaMembershipStatus {
  if (
    value === 'active' ||
    value === 'canceled' ||
    value === 'expired' ||
    value === 'inactive' ||
    value === 'past_due' ||
    value === 'paused' ||
    value === 'pending' ||
    value === 'trialing'
  ) {
    return value;
  }

  return 'inactive';
}

function normalizeMembership(value: unknown): ArcanaMembership {
  const row = Array.isArray(value) && isRecord(value[0]) ? value[0] : isRecord(value) ? value : {};

  return {
    available_runes: numericValue(row.available_runes, 3),
    canceled_at: nullableString(row.canceled_at),
    checkout_expires_at: nullableString(row.checkout_expires_at),
    consecutive_months: numericValue(row.consecutive_months),
    current_period_ends_at: nullableString(row.current_period_ends_at),
    is_active: row.is_active === true,
    last_payment_at: nullableString(row.last_payment_at),
    last_payment_status: nullableString(row.last_payment_status),
    provider: typeof row.provider === 'string' ? row.provider : 'manual',
    started_at: nullableString(row.started_at),
    status: membershipStatus(row.status),
    tier_color: typeof row.tier_color === 'string' ? row.tier_color : '#8B5CF6',
    tier_name: typeof row.tier_name === 'string' ? row.tier_name : 'Centelha',
    tier_number: numericValue(row.tier_number, 1),
  };
}

export async function fetchArcanaMembership(): Promise<ArcanaMembership> {
  const client = getSupabaseClient() as unknown as { rpc: UntypedRpc };
  const { data, error } = await client.rpc('get_my_arcana_membership');

  if (error) throw toProfileActionError(error);
  return normalizeMembership(data);
}

export async function saveProfileGradient(start: string, end: string, angle: number) {
  const { error } = await getSupabaseClient().rpc('set_my_profile_gradient', {
    gradient_angle: angle,
    gradient_end: end,
    gradient_start: start,
  });
  if (error) throw toProfileActionError(error);
}

export async function clearProfileGradient() {
  const { error } = await getSupabaseClient().rpc('clear_my_profile_gradient');
  if (error) throw toProfileActionError(error);
}

export async function fetchMyArcanaRunes(profileId: string) {
  const { data, error } = await getSupabaseClient()
    .from('server_arcana_runes')
    .select('*')
    .eq('profile_id', profileId)
    .order('rune_slot');

  if (error) throw toProfileActionError(error);
  return data;
}

export async function applyArcanaRune(serverId: string, slot: number) {
  const { error } = await getSupabaseClient().rpc('apply_arcana_rune', {
    target_server_id: serverId,
    target_slot: slot,
  });
  if (error) throw toProfileActionError(error);
}

export async function removeArcanaRune(slot: number) {
  const { error } = await getSupabaseClient().rpc('remove_arcana_rune', { target_slot: slot });
  if (error) throw toProfileActionError(error);
}
