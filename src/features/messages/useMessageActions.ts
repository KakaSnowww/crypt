import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastContext';
import { workspaceKeys } from '../workspace/workspace.queries';
import { messageKeys } from './messages.queries';
import {
  deleteChannelMessage,
  editChannelMessage,
  sendChannelMessage,
  toggleMessageReaction,
  togglePinMessage,
} from './messages.service';

export function useMessageActions(serverId: string, channelId: string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: messageKeys.channel(channelId) }),
      queryClient.invalidateQueries({ queryKey: workspaceKeys.unread(serverId) }),
    ]);
  }

  return {
    delete: useMutation({
      mutationFn: deleteChannelMessage,
      onSuccess: refresh,
    }),
    edit: useMutation({
      mutationFn: ({ content, messageId }: { content: string; messageId: string }) =>
        editChannelMessage(messageId, content),
      onSuccess: refresh,
    }),
    pin: useMutation({
      mutationFn: togglePinMessage,
      onSuccess: refresh,
    }),
    react: useMutation({
      mutationFn: ({ emoji, messageId }: { emoji: string; messageId: string }) =>
        toggleMessageReaction(messageId, emoji),
      onSuccess: refresh,
    }),
    send: useMutation({
      mutationFn: sendChannelMessage,
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
