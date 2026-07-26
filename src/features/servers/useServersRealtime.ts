import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';
import { serverKeys } from './servers.queries';
import { workspaceKeys } from '../workspace/workspace.queries';

export function useServersRealtime(userId: null | string, serverId?: null | string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured() || import.meta.env.MODE === 'test') {
      return;
    }

    const client = getSupabaseClient();
    const invalidateServers = () =>
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: serverKeys.all }),
        queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
      ]);
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
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            filter: `server_id=eq.${serverId}`,
            schema: 'public',
            table: 'server_categories',
          },
          invalidateServers,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            filter: `server_id=eq.${serverId}`,
            schema: 'public',
            table: 'server_channels',
          },
          invalidateServers,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            filter: `server_id=eq.${serverId}`,
            schema: 'public',
            table: 'server_roles',
          },
          invalidateServers,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            filter: `server_id=eq.${serverId}`,
            schema: 'public',
            table: 'server_member_roles',
          },
          invalidateServers,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            filter: `server_id=eq.${serverId}`,
            schema: 'public',
            table: 'channel_messages',
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
