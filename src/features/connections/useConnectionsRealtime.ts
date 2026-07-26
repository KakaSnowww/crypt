import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToast } from '../../components/common/ToastContext';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { connectionKeys } from './connections.queries';
import { setMyPresence } from './connections.service';

export function useConnectionsRealtime(userId: null | string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured() || import.meta.env.MODE === 'test') {
      return;
    }

    const client = getSupabaseClient();
    const invalidateConnections = () =>
      void queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    const channel = client
      .channel(`connections:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `recipient_id=eq.${userId}`,
          schema: 'public',
          table: 'connection_notifications',
        },
        () => {
          invalidateConnections();
          addToast({
            message: 'Abra Conexões para ver o que mudou.',
            title: 'Nova atividade',
            tone: 'info',
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `sender_id=eq.${userId}`,
          schema: 'public',
          table: 'friend_requests',
        },
        invalidateConnections,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `receiver_id=eq.${userId}`,
          schema: 'public',
          table: 'friend_requests',
        },
        invalidateConnections,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `user_low_id=eq.${userId}`,
          schema: 'public',
          table: 'friendships',
        },
        invalidateConnections,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `user_high_id=eq.${userId}`,
          schema: 'public',
          table: 'friendships',
        },
        invalidateConnections,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        () => void queryClient.invalidateQueries({ queryKey: connectionKeys.friends }),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [addToast, queryClient, userId]);
}

export function usePresenceHeartbeat(userId: null | string) {
  useEffect(() => {
    if (!userId || !isSupabaseConfigured() || import.meta.env.MODE === 'test') {
      return;
    }

    const updatePresence = () => {
      const status = document.visibilityState === 'hidden' ? 'away' : 'online';
      void setMyPresence(status).catch(() => undefined);
    };
    const markOffline = () => {
      void setMyPresence('offline').catch(() => undefined);
    };

    updatePresence();
    document.addEventListener('visibilitychange', updatePresence);
    window.addEventListener('pagehide', markOffline);
    const heartbeat = window.setInterval(updatePresence, 60_000);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', updatePresence);
      window.removeEventListener('pagehide', markOffline);
      markOffline();
    };
  }, [userId]);
}
