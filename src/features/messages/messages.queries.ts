import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { createAttachmentSignedUrl, fetchChannelMessages } from './messages.service';
import type { ChannelMessageRow } from './messages.types';

export const messageKeys = {
  all: ['messages'] as const,
  attachment: (bucket: string, path: string) => ['messages', 'attachment', bucket, path] as const,
  channel: (channelId: string) => ['messages', 'channel', channelId] as const,
};

export function useChannelMessages(channelId: string, enabled = true) {
  return useInfiniteQuery<
    ChannelMessageRow[],
    Error,
    InfiniteData<ChannelMessageRow[]>,
    ReturnType<typeof messageKeys.channel>,
    undefined | { createdAt: string; messageId: string }
  >({
    enabled: enabled && Boolean(channelId),
    getNextPageParam: (lastPage) => {
      const oldest = lastPage.at(-1);

      return lastPage.length === 50 && oldest
        ? { createdAt: oldest.created_at, messageId: oldest.message_id }
        : undefined;
    },
    initialPageParam: undefined as undefined | { createdAt: string; messageId: string },
    queryFn: ({ pageParam }) => fetchChannelMessages(channelId, pageParam),
    queryKey: messageKeys.channel(channelId),
  });
}

export function useAttachmentSignedUrl(path: string, bucket = 'message-attachments') {
  return useQuery({
    enabled: Boolean(path),
    queryFn: () => createAttachmentSignedUrl(path, bucket),
    queryKey: messageKeys.attachment(bucket, path),
    staleTime: 12 * 60 * 1000,
  });
}
