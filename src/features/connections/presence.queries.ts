import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastContext';
import { connectionKeys } from './connections.queries';
import { fetchMyPresencePreferences, saveMyPresencePreference } from './presence.service';
import type { SavePresencePreferenceInput } from './presence.types';

export const presenceKeys = {
  all: ['presence-preferences'] as const,
  mine: ['presence-preferences', 'mine'] as const,
};

export function useMyPresencePreferences(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchMyPresencePreferences,
    queryKey: presenceKeys.mine,
  });
}

export function usePresenceActions() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return {
    save: useMutation({
      mutationFn: (input: SavePresencePreferenceInput) => saveMyPresencePreference(input),
      onError: (error) => {
        addToast({
          message: error instanceof Error ? error.message : 'Tente novamente.',
          title: 'Status não atualizado',
          tone: 'error',
        });
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: presenceKeys.all }),
          queryClient.invalidateQueries({ queryKey: connectionKeys.all }),
        ]);
        addToast({
          message: 'Seu status já foi sincronizado nos seus dispositivos.',
          title: 'Presença atualizada',
          tone: 'success',
        });
      },
    }),
  };
}
