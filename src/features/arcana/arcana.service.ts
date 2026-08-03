import { getSupabaseClient } from '../../lib/supabase/client';
import { toProfileActionError } from '../profile/profile.errors';
import type { ArcanaMembership } from './arcana.types';
export async function fetchArcanaMembership(): Promise<ArcanaMembership> {
  const { data, error } = await getSupabaseClient().rpc('get_my_arcana_membership');
  if (error) throw toProfileActionError(error);
  return data[0];
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
