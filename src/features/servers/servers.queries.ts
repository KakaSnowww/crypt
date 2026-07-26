import { useQuery } from '@tanstack/react-query';
import {
  fetchMyServers,
  fetchServerInvitePreview,
  fetchServerInvites,
  fetchServerMembers,
  fetchServerOverview,
} from './servers.service';

export const serverKeys = {
  all: ['servers'] as const,
  detail: (serverId: string) => ['servers', 'detail', serverId] as const,
  invite: (code: string) => ['servers', 'invite', code] as const,
  invites: (serverId: string) => ['servers', 'invites', serverId] as const,
  list: ['servers', 'list'] as const,
  members: (serverId: string) => ['servers', 'members', serverId] as const,
};

export function useMyServers(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchMyServers,
    queryKey: serverKeys.list,
  });
}

export function useServerOverview(serverId: null | string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerOverview(serverId ?? ''),
    queryKey: serverKeys.detail(serverId ?? ''),
  });
}

export function useServerMembers(serverId: null | string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerMembers(serverId ?? ''),
    queryKey: serverKeys.members(serverId ?? ''),
  });
}

export function useServerInvites(serverId: null | string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerInvites(serverId ?? ''),
    queryKey: serverKeys.invites(serverId ?? ''),
  });
}

export function useServerInvitePreview(code: string, enabled = true) {
  return useQuery({
    enabled: enabled && code.length > 0,
    queryFn: () => fetchServerInvitePreview(code),
    queryKey: serverKeys.invite(code),
    retry: false,
  });
}
