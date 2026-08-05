import { useQuery } from '@tanstack/react-query';
import { fetchServerOnboardingStatus } from './serverOnboarding.service';

export const serverOnboardingKeys = {
  all: ['server-onboarding'] as const,
  status: (serverId: string) => ['server-onboarding', serverId, 'status'] as const,
};

export function useServerOnboardingStatus(serverId: null | string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerOnboardingStatus(serverId ?? ''),
    queryKey: serverOnboardingKeys.status(serverId ?? ''),
    retry: false,
    staleTime: 15_000,
  });
}
