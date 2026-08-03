import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { directMessageKeys } from './directMessages.queries';

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

export function useDirectListRealtime(currentUserId: null | string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUserId || !isSupabaseConfigured() || import.meta.env.MODE === 'test') {
      return;
    }

    const client = getSupabaseClient();
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: directMessageKeys.list });
    };
    const channel = client
      .channel(`direct-list:${currentUserId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_conversations' },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_conversation_participants',
        },
        invalidate,
      );

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [currentUserId, queryClient]);
}

export function useDirectMessagesRealtime(
  conversationId: null | string,
  currentUserId: null | string,
  displayName: string,
) {
  const queryClient = useQueryClient();
  const [typingPeople, setTypingPeople] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (
      !conversationId ||
      !currentUserId ||
      !isSupabaseConfigured() ||
      import.meta.env.MODE === 'test'
    ) {
      return;
    }

    const client = getSupabaseClient();
    const invalidate = () => {
      void queryClient.invalidateQueries({
        queryKey: directMessageKeys.conversation(conversationId),
      });
      void queryClient.invalidateQueries({ queryKey: directMessageKeys.list });
    };
    const channel = client
      .channel(`direct-messages:${conversationId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `conversation_id=eq.${conversationId}`,
          schema: 'public',
          table: 'direct_messages',
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_message_reactions' },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `conversation_id=eq.${conversationId}`,
          schema: 'public',
          table: 'direct_conversation_participants',
        },
        () => {
          invalidate();
          void queryClient.invalidateQueries({
            queryKey: directMessageKeys.groupMembers(conversationId),
          });
        },
      );

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [conversationId, currentUserId, queryClient]);

  useEffect(() => {
    if (
      !conversationId ||
      !currentUserId ||
      !isSupabaseConfigured() ||
      import.meta.env.MODE === 'test'
    ) {
      return;
    }

    const entry = acquireTypingEntry(conversationId);
    const listener = (payload: TypingPayload) => {
      if (payload.profileId === currentUserId) return;
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
      releaseTypingEntry(conversationId);
    };
  }, [conversationId, currentUserId]);

  return {
    announceTyping: () => {
      if (!conversationId || !currentUserId) return;
      const entry = typingEntries.get(conversationId);
      if (!entry) return;
      void entry.channel.send({
        event: 'typing',
        payload: { displayName, profileId: currentUserId } satisfies TypingPayload,
        type: 'broadcast',
      });
    },
    typingNames: [...typingPeople.values()],
  };
}

function acquireTypingEntry(conversationId: string) {
  const existing = typingEntries.get(conversationId);

  if (existing) {
    if (existing.removalTimer) clearTimeout(existing.removalTimer);
    existing.references += 1;
    return existing;
  }

  const listeners = new Set<(payload: TypingPayload) => void>();
  const channel = getSupabaseClient()
    .channel(`direct-typing:${conversationId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const typingPayload = payload as TypingPayload;
      listeners.forEach((listener) => listener(typingPayload));
    });
  const entry: TypingEntry = { channel, listeners, references: 1 };
  typingEntries.set(conversationId, entry);
  channel.subscribe();
  return entry;
}

function releaseTypingEntry(conversationId: string) {
  const entry = typingEntries.get(conversationId);
  if (!entry) return;
  entry.references -= 1;
  if (entry.references > 0) return;
  entry.removalTimer = setTimeout(() => {
    if (entry.references === 0) {
      typingEntries.delete(conversationId);
      void getSupabaseClient().removeChannel(entry.channel);
    }
  }, 150);
}
