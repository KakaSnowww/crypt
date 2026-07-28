import { getSupabaseClient } from '../../lib/supabase/client';
import { toWorkspaceActionError } from './workspace.errors';
import type {
  ChannelInput,
  ChannelUnread,
  PermissionOverride,
  RoleInput,
  ServerCategory,
  ServerChannel,
  ServerMemberRoles,
  ServerRole,
} from './workspace.types';

async function rpc<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;

  if (error) {
    throw toWorkspaceActionError(error);
  }

  return data as T;
}

export function fetchServerCategories(serverId: string): Promise<ServerCategory[]> {
  return rpc<ServerCategory[]>(
    getSupabaseClient().rpc('get_server_categories', {
      target_server_id: serverId,
    }),
  );
}

export function fetchServerChannels(serverId: string): Promise<ServerChannel[]> {
  return rpc<ServerChannel[]>(
    getSupabaseClient().rpc('get_server_channels', {
      target_server_id: serverId,
    }),
  );
}

export function fetchServerRoles(serverId: string): Promise<ServerRole[]> {
  return rpc<ServerRole[]>(
    getSupabaseClient().rpc('get_server_roles', {
      target_server_id: serverId,
    }),
  );
}

export function fetchServerMemberRoles(serverId: string): Promise<ServerMemberRoles[]> {
  return rpc<ServerMemberRoles[]>(
    getSupabaseClient().rpc('get_server_member_roles', {
      target_server_id: serverId,
    }),
  );
}

export function fetchPermissionOverrides(serverId: string): Promise<PermissionOverride[]> {
  return rpc<PermissionOverride[]>(
    getSupabaseClient().rpc('get_server_permission_overrides', {
      target_server_id: serverId,
    }),
  );
}

export function fetchMyServerPermissions(serverId: string): Promise<number> {
  return rpc<number>(
    getSupabaseClient().rpc('get_my_server_permissions', {
      target_server_id: serverId,
    }),
  );
}

export function fetchServerUnreadCounts(serverId: string): Promise<ChannelUnread[]> {
  return rpc<ChannelUnread[]>(
    getSupabaseClient().rpc('get_server_unread_counts', {
      target_server_id: serverId,
    }),
  );
}

export function createCategory(serverId: string, name: string) {
  return rpc(
    getSupabaseClient().rpc('create_server_category', {
      category_name: name.trim(),
      target_server_id: serverId,
    }),
  );
}

export function updateCategory(categoryId: string, name: string) {
  return rpc(
    getSupabaseClient().rpc('update_server_category', {
      category_name: name.trim(),
      target_category_id: categoryId,
    }),
  );
}

export function moveCategory(categoryId: string, direction: -1 | 1) {
  return rpc(
    getSupabaseClient().rpc('move_server_category', {
      direction,
      target_category_id: categoryId,
    }),
  );
}

export function deleteCategory(categoryId: string) {
  return rpc(
    getSupabaseClient().rpc('delete_server_category', {
      target_category_id: categoryId,
    }),
  );
}

export function createChannel(serverId: string, input: ChannelInput) {
  if (input.channelType !== 'text') {
    return rpc(
      getSupabaseClient().rpc('create_server_media_channel', {
        channel_icon: input.icon || null,
        channel_name: input.name.trim(),
        channel_topic: input.topic || null,
        media_channel_type: input.channelType,
        target_category_id: input.categoryId,
        target_server_id: serverId,
      }),
    );
  }

  return rpc(
    getSupabaseClient().rpc('create_server_channel', {
      channel_icon: input.icon || null,
      channel_is_read_only: input.isReadOnly,
      channel_name: input.name.trim(),
      channel_slowmode_seconds: input.slowmodeSeconds,
      channel_topic: input.topic || null,
      target_category_id: input.categoryId,
      target_server_id: serverId,
    }),
  );
}

export function updateChannel(channelId: string, input: ChannelInput) {
  return rpc(
    getSupabaseClient().rpc('update_server_channel', {
      channel_icon: input.icon || null,
      channel_is_read_only: input.isReadOnly,
      channel_name: input.name.trim(),
      channel_slowmode_seconds: input.slowmodeSeconds,
      channel_topic: input.topic || null,
      target_category_id: input.categoryId,
      target_channel_id: channelId,
    }),
  );
}

export function moveChannel(channelId: string, direction: -1 | 1) {
  return rpc(
    getSupabaseClient().rpc('move_server_channel', {
      direction,
      target_channel_id: channelId,
    }),
  );
}

export function deleteChannel(channelId: string) {
  return rpc(
    getSupabaseClient().rpc('delete_server_channel', {
      target_channel_id: channelId,
    }),
  );
}

export function createRole(serverId: string, input: RoleInput) {
  return rpc(
    getSupabaseClient().rpc('create_server_role', {
      role_color: input.color,
      role_display_separately: input.displaySeparately,
      role_name: input.name.trim(),
      role_permissions: input.permissions,
      target_server_id: serverId,
    }),
  );
}

export function updateRole(roleId: string, input: RoleInput) {
  return rpc(
    getSupabaseClient().rpc('update_server_role', {
      role_color: input.color,
      role_display_separately: input.displaySeparately,
      role_name: input.name.trim(),
      role_permissions: input.permissions,
      target_role_id: roleId,
    }),
  );
}

export function deleteRole(roleId: string) {
  return rpc(
    getSupabaseClient().rpc('delete_server_role', {
      target_role_id: roleId,
    }),
  );
}

export function moveRole(roleId: string, direction: -1 | 1) {
  return rpc(
    getSupabaseClient().rpc('move_server_role', {
      direction,
      target_role_id: roleId,
    }),
  );
}

export function setMemberRoles(serverId: string, profileId: string, roleIds: string[]) {
  return rpc(
    getSupabaseClient().rpc('set_server_member_roles', {
      target_profile_id: profileId,
      target_role_ids: roleIds,
      target_server_id: serverId,
    }),
  );
}

export function savePermissionOverride(input: {
  allowPermissions: number;
  denyPermissions: number;
  kind: 'category' | 'channel';
  roleId: string;
  serverId: string;
  targetId: string;
}) {
  return rpc(
    getSupabaseClient().rpc('set_server_permission_override', {
      allowed_permissions: input.allowPermissions,
      denied_permissions: input.denyPermissions,
      target_id: input.targetId,
      target_kind: input.kind,
      target_role_id: input.roleId,
      target_server_id: input.serverId,
    }),
  );
}

export function deletePermissionOverride(overrideId: string) {
  return rpc(
    getSupabaseClient().rpc('delete_server_permission_override', {
      target_override_id: overrideId,
    }),
  );
}
