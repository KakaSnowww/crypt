import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastContext';
import {
  deleteDirectMessage,
  editDirectMessage,
  hideDirectConversation,
  openDirectConversation,
  sendDirectMessage,
  toggleDirectReaction,
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
    ]);
  }

  return {
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
  };
}
