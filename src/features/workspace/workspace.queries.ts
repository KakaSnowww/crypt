import { useQuery } from '@tanstack/react-query';
import {
  fetchMyServerPermissions,
  fetchPermissionOverrides,
  fetchServerCategories,
  fetchServerChannels,
  fetchServerMemberRoles,
  fetchServerRoles,
  fetchServerUnreadCounts,
} from './workspace.service';

export const workspaceKeys = {
  all: ['workspace'] as const,
  categories: (serverId: string) => ['workspace', serverId, 'categories'] as const,
  channels: (serverId: string) => ['workspace', serverId, 'channels'] as const,
  memberRoles: (serverId: string) => ['workspace', serverId, 'member-roles'] as const,
  overrides: (serverId: string) => ['workspace', serverId, 'overrides'] as const,
  permissions: (serverId: string) => ['workspace', serverId, 'permissions'] as const,
  roles: (serverId: string) => ['workspace', serverId, 'roles'] as const,
  unread: (serverId: string) => ['workspace', serverId, 'unread'] as const,
};

function useServerQuery<T>(
  serverId: null | string,
  enabled: boolean,
  key: (serverId: string) => readonly unknown[],
  queryFn: (serverId: string) => Promise<T>,
) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => queryFn(serverId ?? ''),
    queryKey: key(serverId ?? ''),
  });
}

export function useServerCategories(serverId: null | string, enabled = true) {
  return useServerQuery(serverId, enabled, workspaceKeys.categories, fetchServerCategories);
}

export function useServerChannels(serverId: null | string, enabled = true) {
  return useServerQuery(serverId, enabled, workspaceKeys.channels, fetchServerChannels);
}

export function useServerRoles(serverId: null | string, enabled = true) {
  return useServerQuery(serverId, enabled, workspaceKeys.roles, fetchServerRoles);
}

export function useServerMemberRoles(serverId: null | string, enabled = true) {
  return useServerQuery(serverId, enabled, workspaceKeys.memberRoles, fetchServerMemberRoles);
}

export function usePermissionOverrides(serverId: null | string, enabled = true) {
  return useServerQuery(serverId, enabled, workspaceKeys.overrides, fetchPermissionOverrides);
}

export function useMyServerPermissions(serverId: null | string, enabled = true) {
  return useServerQuery(serverId, enabled, workspaceKeys.permissions, fetchMyServerPermissions);
}

export function useServerUnreadCounts(serverId: null | string, enabled = true) {
  return useServerQuery(serverId, enabled, workspaceKeys.unread, fetchServerUnreadCounts);
}
