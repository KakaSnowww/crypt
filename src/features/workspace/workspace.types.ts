import type { Database } from '../../types/database';

type Functions = Database['public']['Functions'];

export type ServerCategory = Functions['get_server_categories']['Returns'][number];
export type ServerChannel = Functions['get_server_channels']['Returns'][number];
export type ServerRole = Functions['get_server_roles']['Returns'][number];
export type ServerMemberRoles = Functions['get_server_member_roles']['Returns'][number];
export type PermissionOverride = Functions['get_server_permission_overrides']['Returns'][number];
export type ChannelUnread = Functions['get_server_unread_counts']['Returns'][number];

export type ChannelInput = {
  categoryId: null | string;
  icon: string;
  isReadOnly: boolean;
  name: string;
  slowmodeSeconds: number;
  topic: string;
};

export type RoleInput = {
  color: string;
  displaySeparately: boolean;
  name: string;
  permissions: number;
};
