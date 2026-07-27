import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { fetchDirectConversations, fetchDirectMessages } from './directMessages.service';
import type { DirectMessageRow } from './directMessages.types';

export const directMessageKeys = {
  all: ['direct-messages'] as const,
  conversation: (conversationId: string) =>
    ['direct-messages', 'conversation', conversationId] as const,
  list: ['direct-messages', 'list'] as const,
};

export function useDirectConversations(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchDirectConversations,
    queryKey: directMessageKeys.list,
  });
}

export function useDirectMessages(conversationId: string, enabled = true) {
  return useInfiniteQuery<
    DirectMessageRow[],
    Error,
    InfiniteData<DirectMessageRow[]>,
    ReturnType<typeof directMessageKeys.conversation>,
    undefined | { createdAt: string; messageId: string }
  >({
    enabled: enabled && Boolean(conversationId),
    getNextPageParam: (lastPage) => {
      const oldest = lastPage.at(-1);

      return lastPage.length === 50 && oldest
        ? { createdAt: oldest.created_at, messageId: oldest.message_id }
        : undefined;
    },
    initialPageParam: undefined as undefined | { createdAt: string; messageId: string },
    queryFn: ({ pageParam }) => fetchDirectMessages(conversationId, pageParam),
    queryKey: directMessageKeys.conversation(conversationId),
  });
}
