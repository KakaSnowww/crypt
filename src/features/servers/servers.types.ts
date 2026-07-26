import type { Database } from '../../types/database';

type Functions = Database['public']['Functions'];

export type ServerSummary = Functions['get_my_servers']['Returns'][number];
export type ServerOverview = Functions['get_server_overview']['Returns'][number];
export type ServerMember = Functions['get_server_members']['Returns'][number];
export type ServerInvite = Functions['get_server_invites']['Returns'][number];
export type ServerInvitePreview = Functions['get_server_invite_preview']['Returns'][number];

export type ServerMediaKind = 'banner' | 'icon';

export type CreateServerInput = {
  description: string;
  name: string;
};

export type UpdateServerInput = CreateServerInput & {
  bannerPath: null | string;
  iconPath: null | string;
  serverId: string;
};

export type CreateServerInviteInput = {
  expiresInHours: null | number;
  maxUses: null | number;
  serverId: string;
};
