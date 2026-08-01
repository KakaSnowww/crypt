import { getSupabaseClient } from '../../lib/supabase/client';
import { toVoiceError } from './voice.errors';
import type { VoiceChannelPresence, VoiceConnection } from './voice.types';

export async function createVoiceConnection(channelId: string): Promise<VoiceConnection> {
  const result = (await getSupabaseClient().functions.invoke('livekit-token', {
    body: { channel_id: channelId },
  })) as { data: VoiceConnection | null; error: unknown };

  if (result.error || !result.data) {
    throw await toVoiceError(result.error);
  }

  return result.data;
}

export async function createAndroidScreenShareConnection(
  channelId: string,
): Promise<VoiceConnection> {
  const result = (await getSupabaseClient().functions.invoke('livekit-token', {
    body: { action: 'android_screen_share', channel_id: channelId },
  })) as { data: VoiceConnection | null; error: unknown };

  if (result.error || !result.data) {
    throw await toVoiceError(result.error);
  }

  return result.data;
}

export async function setMyVoicePresence(channelId: null | string, microphoneMuted = false) {
  const { error } = await getSupabaseClient().rpc('set_my_voice_channel_presence', {
    microphone_is_muted: microphoneMuted,
    target_channel_id: channelId,
  });

  if (error) {
    throw new Error(`Não foi possível atualizar sua presença na chamada: ${error.message}`);
  }
}

export async function getServerVoicePresence(serverId: string): Promise<VoiceChannelPresence[]> {
  const { data, error } = await getSupabaseClient().rpc('get_server_voice_channel_presence', {
    target_server_id: serverId,
  });

  if (error) {
    throw new Error(`Não foi possível carregar quem está nas chamadas: ${error.message}`);
  }
  return data;
}

export async function getLiveKitChannelPresence(
  channelId: string,
): Promise<VoiceChannelPresence[]> {
  const result = (await getSupabaseClient().functions.invoke('livekit-token', {
    body: { action: 'participants', channel_id: channelId },
  })) as {
    data: {
      participants?: Array<Omit<VoiceChannelPresence, 'channel_id' | 'joined_at'>>;
    } | null;
    error: unknown;
  };

  if (result.error || !result.data) {
    throw await toVoiceError(result.error);
  }

  return (result.data.participants ?? []).map((participant) => ({
    ...participant,
    channel_id: channelId,
    joined_at: '',
  }));
}
