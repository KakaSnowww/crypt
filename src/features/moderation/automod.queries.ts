import { useQuery } from '@tanstack/react-query';
import { fetchServerAutoModEvents, fetchServerAutoModSettings } from './automod.service';

export const autoModKeys = {
  all: (serverId: string) => ['automod', serverId] as const,
  events: (serverId: string) => ['automod', serverId, 'events'] as const,
  settings: (serverId: string) => ['automod', serverId, 'settings'] as const,
};

export function useServerAutoModSettings(serverId: string) {
  return useQuery({
    enabled: Boolean(serverId),
    queryFn: () => fetchServerAutoModSettings(serverId),
    queryKey: autoModKeys.settings(serverId),
  });
}

export function useServerAutoModEvents(serverId: string) {
  return useQuery({
    enabled: Boolean(serverId),
    queryFn: () => fetchServerAutoModEvents(serverId),
    queryKey: autoModKeys.events(serverId),
    refetchInterval: 10_000,
  });
}
