import { useQuery } from '@tanstack/react-query';
import { fetchArcanaMembership } from './arcana.service';
export const arcanaKeys = { membership: ['arcana', 'membership'] as const };
export function useArcanaMembership(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchArcanaMembership,
    queryKey: arcanaKeys.membership,
    staleTime: 60_000,
  });
}
