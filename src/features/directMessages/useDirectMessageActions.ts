import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastContext';
import {
  addDirectGroupMember,
  createDirectGroup,
  deleteDirectMessage,
  deleteDirectGroup,
  editDirectMessage,
  hideDirectConversation,
  leaveDirectGroup,
  openDirectConversation,
  removeDirectGroupMember,
  sendDirectMessage,
  toggleDirectReaction,
  transferDirectGroupOwnership,
  updateDirectGroup,
} from './directMessages.service';
import { directMessageKeys } from './directMessages.queries';

export function useDirectMessageActions(conversationId?: string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: directMessageKeys.list }),
      conversationId
        ? queryClient.invalidateQueries({
            queryKey: directMessageKeys.conversation(conversationId),
          })
        : Promise.resolve(),
      conversationId
        ? queryClient.invalidateQueries({
            queryKey: directMessageKeys.groupMembers(conversationId),
          })
        : Promise.resolve(),
    ]);
  }

  function showGroupError(error: unknown) {
    addToast({
      message: error instanceof Error ? error.message : 'Tente novamente.',
      title: 'Grupo não atualizado',
      tone: 'error',
    });
  }

  return {
    addGroupMember: useMutation({
      mutationFn: ({ conversationId, profileId }: { conversationId: string; profileId: string }) =>
        addDirectGroupMember(conversationId, profileId),
      onError: showGroupError,
      onSuccess: refresh,
    }),
    createGroup: useMutation({
      mutationFn: createDirectGroup,
      onError: showGroupError,
      onSuccess: refresh,
    }),
    deleteGroup: useMutation({
      mutationFn: deleteDirectGroup,
      onError: showGroupError,
      onSuccess: refresh,
    }),
    delete: useMutation({
      mutationFn: deleteDirectMessage,
      onSuccess: refresh,
    }),
    edit: useMutation({
      mutationFn: ({ content, messageId }: { content: string; messageId: string }) =>
        editDirectMessage(messageId, content),
      onSuccess: refresh,
    }),
    hide: useMutation({
      mutationFn: hideDirectConversation,
      onSuccess: refresh,
    }),
    leaveGroup: useMutation({
      mutationFn: leaveDirectGroup,
      onError: showGroupError,
      onSuccess: refresh,
    }),
    open: useMutation({
      mutationFn: openDirectConversation,
      onError: (error) => {
        addToast({
          message: error instanceof Error ? error.message : 'Tente novamente.',
          title: 'Conversa não iniciada',
          tone: 'error',
        });
      },
      onSuccess: refresh,
    }),
    react: useMutation({
      mutationFn: ({ emoji, messageId }: { emoji: string; messageId: string }) =>
        toggleDirectReaction(messageId, emoji),
      onSuccess: refresh,
    }),
    removeGroupMember: useMutation({
      mutationFn: ({ conversationId, profileId }: { conversationId: string; profileId: string }) =>
        removeDirectGroupMember(conversationId, profileId),
      onError: showGroupError,
      onSuccess: refresh,
    }),
    send: useMutation({
      mutationFn: sendDirectMessage,
      onError: (error) => {
        addToast({
          message: error instanceof Error ? error.message : 'Tente novamente.',
          title: 'Mensagem não enviada',
          tone: 'error',
        });
      },
      onSuccess: refresh,
    }),
    transferGroup: useMutation({
      mutationFn: ({ conversationId, profileId }: { conversationId: string; profileId: string }) =>
        transferDirectGroupOwnership(conversationId, profileId),
      onError: showGroupError,
      onSuccess: refresh,
    }),
    updateGroup: useMutation({
      mutationFn: updateDirectGroup,
      onError: showGroupError,
      onSuccess: refresh,
    }),
  };
}
