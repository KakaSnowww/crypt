import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastContext';
import { connectionKeys } from './connections.queries';
import {
  blockProfile,
  cancelFriendRequest,
  dismissFriendSuggestion,
  removeFriend,
  reportProfile,
  respondFriendRequest,
  sendFriendRequest,
  unblockProfile,
} from './connections.service';

export function useConnectionActions() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function refreshConnections() {
    await queryClient.invalidateQueries({ queryKey: connectionKeys.all });
  }

  const sendRequest = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: async () => {
      await refreshConnections();
      addToast({
        message: 'A pessoa poderá aceitar ou recusar em Conexões.',
        title: 'Pedido enviado',
        tone: 'success',
      });
    },
  });
  const cancelRequest = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: async () => {
      await refreshConnections();
      addToast({
        message: 'O pedido não aparece mais para a outra pessoa.',
        title: 'Pedido cancelado',
        tone: 'info',
      });
    },
  });
  const respondRequest = useMutation({
    mutationFn: ({ accept, requestId }: { accept: boolean; requestId: string }) =>
      respondFriendRequest(requestId, accept),
    onSuccess: async (_, variables) => {
      await refreshConnections();
      addToast({
        message: variables.accept
          ? 'A nova amizade já está na sua lista.'
          : 'O pedido foi removido com discrição.',
        title: variables.accept ? 'Pedido aceito' : 'Pedido recusado',
        tone: variables.accept ? 'success' : 'info',
      });
    },
  });
  const remove = useMutation({
    mutationFn: removeFriend,
    onSuccess: async () => {
      await refreshConnections();
      addToast({
        message: 'A pessoa saiu da sua lista de amigos.',
        title: 'Amizade removida',
        tone: 'info',
      });
    },
  });
  const report = useMutation({
    mutationFn: ({
      details,
      profileId,
      reason,
    }: {
      details: null | string;
      profileId: string;
      reason: string;
    }) => reportProfile(profileId, reason, details),
    onSuccess: () => {
      addToast({
        message: 'A denúncia foi guardada de forma privada para análise.',
        title: 'Denúncia enviada',
        tone: 'success',
      });
    },
  });
  const block = useMutation({
    mutationFn: blockProfile,
    onSuccess: async () => {
      await refreshConnections();
      addToast({
        message: 'Pedidos e sugestões entre vocês foram interrompidos.',
        title: 'Pessoa bloqueada',
        tone: 'info',
      });
    },
  });
  const unblock = useMutation({
    mutationFn: unblockProfile,
    onSuccess: async () => {
      await refreshConnections();
      addToast({
        message: 'Novas interações dependerão das configurações de privacidade.',
        title: 'Bloqueio removido',
        tone: 'success',
      });
    },
  });
  const dismissSuggestion = useMutation({
    mutationFn: ({ permanently, profileId }: { permanently: boolean; profileId: string }) =>
      dismissFriendSuggestion(profileId, permanently),
    onSuccess: async (_, variables) => {
      await refreshConnections();
      addToast({
        message: variables.permanently
          ? 'Esta pessoa não voltará para suas sugestões.'
          : 'A sugestão ficará oculta por 30 dias.',
        title: variables.permanently ? 'Sugestão removida' : 'Sugestão ignorada',
        tone: 'info',
      });
    },
  });

  return {
    block,
    cancelRequest,
    dismissSuggestion,
    remove,
    report,
    respondRequest,
    sendRequest,
    unblock,
  };
}
