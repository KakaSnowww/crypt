import { useQuery } from '@tanstack/react-query';
import { fetchMyServerArcanaStatuses, fetchServerArcanaStatus } from './serverArcana.service';

export const serverArcanaKeys = {
  all: ['server-arcana'] as const,
  detail: (serverId: string) => ['server-arcana', 'detail', serverId] as const,
  list: ['server-arcana', 'list'] as const,
};

export function useServerArcanaStatus(
  serverId: null | string,
  enabled = import.meta.env.MODE !== 'test',
) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerArcanaStatus(serverId ?? ''),
    queryKey: serverArcanaKeys.detail(serverId ?? ''),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMyServerArcanaStatuses(enabled = import.meta.env.MODE !== 'test') {
  return useQuery({
    enabled,
    queryFn: fetchMyServerArcanaStatuses,
    queryKey: serverArcanaKeys.list,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
