import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { serverKeys } from './servers.queries';

export function useServersRealtime(userId: null | string, serverId?: null | string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured() || import.meta.env.MODE === 'test') {
      return;
    }

    const client = getSupabaseClient();
    const invalidateServers = () =>
      void queryClient.invalidateQueries({ queryKey: serverKeys.all });
    let channel = client
      .channel(createServersRealtimeTopic(userId, serverId))
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `profile_id=eq.${userId}`,
          schema: 'public',
          table: 'server_members',
        },
        invalidateServers,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'servers',
        },
        invalidateServers,
      );

    if (serverId) {
      channel = channel
        .on(
          'postgres_changes',
          {
            event: '*',
            filter: `server_id=eq.${serverId}`,
            schema: 'public',
            table: 'server_members',
          },
          invalidateServers,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            filter: `server_id=eq.${serverId}`,
            schema: 'public',
            table: 'server_invites',
          },
          invalidateServers,
        );
    }

    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [queryClient, serverId, userId]);
}

export function createServersRealtimeTopic(userId: string, serverId?: null | string) {
  return `servers:${userId}:${serverId ?? 'list'}:${crypto.randomUUID()}`;
}
