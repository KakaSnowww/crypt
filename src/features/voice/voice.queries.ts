import { useQuery } from '@tanstack/react-query';
import { createVoiceConnection, getLiveKitChannelPresence } from './voice.service';

export const voiceKeys = {
  all: ['voice'] as const,
  connection: (channelId: string) => ['voice', 'connection', channelId] as const,
  presence: (serverId: string, channelIds: string[]) =>
    ['voice', 'presence', serverId, channelIds] as const,
};

export function useVoiceConnection(channelId: string, enabled: boolean) {
  return useQuery({
    enabled: enabled && Boolean(channelId),
    gcTime: 0,
    queryFn: () => createVoiceConnection(channelId),
    queryKey: voiceKeys.connection(channelId),
    retry: false,
    staleTime: 8 * 60 * 1000,
  });
}

export function useServerVoicePresence(
  serverId: null | string,
  channelIds: string[],
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(serverId) && channelIds.length > 0,
    queryFn: async () => (await Promise.all(channelIds.map(getLiveKitChannelPresence))).flat(),
    queryKey: voiceKeys.presence(serverId ?? '', channelIds),
    refetchInterval: 2_000,
    refetchIntervalInBackground: true,
    staleTime: 500,
  });
}
