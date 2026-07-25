import { useQuery } from '@tanstack/react-query';
import {
  fetchCurrentProfile,
  fetchInterestCatalog,
  fetchProfileSettings,
  fetchSelectedInterestIds,
} from './profile.service';

export const profileKeys = {
  all: ['profile'] as const,
  catalog: ['profile', 'interest-catalog'] as const,
  current: (userId: string) => ['profile', 'current', userId] as const,
  selections: (userId: string) => ['profile', 'selections', userId] as const,
  settings: (userId: string) => ['profile', 'settings', userId] as const,
};

export function useCurrentProfile(userId: null | string, enabled = true) {
  return useQuery({
    enabled: Boolean(userId) && enabled,
    queryFn: () => fetchCurrentProfile(userId as string),
    queryKey: profileKeys.current(userId ?? 'anonymous'),
  });
}

export function useProfileSettings(userId: null | string, enabled = true) {
  return useQuery({
    enabled: Boolean(userId) && enabled,
    queryFn: () => fetchProfileSettings(userId as string),
    queryKey: profileKeys.settings(userId ?? 'anonymous'),
  });
}

export function useInterestCatalog(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchInterestCatalog,
    queryKey: profileKeys.catalog,
    staleTime: 5 * 60_000,
  });
}

export function useSelectedInterestIds(userId: null | string, enabled = true) {
  return useQuery({
    enabled: Boolean(userId) && enabled,
    queryFn: () => fetchSelectedInterestIds(userId as string),
    queryKey: profileKeys.selections(userId ?? 'anonymous'),
  });
}
