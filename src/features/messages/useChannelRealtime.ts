import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { workspaceKeys } from '../workspace/workspace.queries';
import { messageKeys } from './messages.queries';

type TypingPayload = {
  displayName: string;
  profileId: string;
};

type TypingEntry = {
  channel: RealtimeChannel;
  listeners: Set<(payload: TypingPayload) => void>;
  references: number;
  removalTimer?: ReturnType<typeof setTimeout>;
};

const typingEntries = new Map<string, TypingEntry>();

export function useChannelRealtime(
  serverId: string,
  channelId: string,
  currentUserId: null | string,
  displayName: string,
) {
  const queryClient = useQueryClient();
  const [typingPeople, setTypingPeople] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (
      !currentUserId ||
      !serverId ||
      !channelId ||
      !isSupabaseConfigured() ||
      import.meta.env.MODE === 'test'
    ) {
      return;
    }

    const client = getSupabaseClient();
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: messageKeys.channel(channelId) });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.unread(serverId) });
    };
    const realtimeChannel = client
      .channel(`channel-messages:${channelId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `channel_id=eq.${channelId}`,
          schema: 'public',
          table: 'channel_messages',
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        invalidate,
      );

    realtimeChannel.subscribe();

    return () => {
      void client.removeChannel(realtimeChannel);
    };
  }, [channelId, currentUserId, queryClient, serverId]);

  useEffect(() => {
    if (
      !currentUserId ||
      !channelId ||
      !isSupabaseConfigured() ||
      import.meta.env.MODE === 'test'
    ) {
      return;
    }

    const entry = acquireTypingEntry(channelId);
    const listener = (payload: TypingPayload) => {
      if (payload.profileId === currentUserId) {
        return;
      }

      setTypingPeople((current) => new Map(current).set(payload.profileId, payload.displayName));
      window.setTimeout(() => {
        setTypingPeople((current) => {
          const next = new Map(current);
          next.delete(payload.profileId);
          return next;
        });
      }, 2_500);
    };

    entry.listeners.add(listener);

    return () => {
      entry.listeners.delete(listener);
      releaseTypingEntry(channelId);
    };
  }, [channelId, currentUserId]);

  return {
    announceTyping: () => {
      const entry = typingEntries.get(channelId);

      if (!entry || !currentUserId) {
        return;
      }

      void entry.channel.send({
        event: 'typing',
        payload: { displayName, profileId: currentUserId } satisfies TypingPayload,
        type: 'broadcast',
      });
    },
    typingNames: [...typingPeople.values()],
  };
}

function acquireTypingEntry(channelId: string) {
  const existing = typingEntries.get(channelId);

  if (existing) {
    if (existing.removalTimer) {
      clearTimeout(existing.removalTimer);
    }

    existing.references += 1;
    return existing;
  }

  const listeners = new Set<(payload: TypingPayload) => void>();
  const channel = getSupabaseClient()
    .channel(`channel-typing:${channelId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const typingPayload = payload as TypingPayload;
      listeners.forEach((listener) => listener(typingPayload));
    });
  const entry: TypingEntry = { channel, listeners, references: 1 };
  typingEntries.set(channelId, entry);
  channel.subscribe();
  return entry;
}

function releaseTypingEntry(channelId: string) {
  const entry = typingEntries.get(channelId);

  if (!entry) {
    return;
  }

  entry.references -= 1;

  if (entry.references > 0) {
    return;
  }

  entry.removalTimer = setTimeout(() => {
    if (entry.references === 0) {
      typingEntries.delete(channelId);
      void getSupabaseClient().removeChannel(entry.channel);
    }
  }, 150);
}
