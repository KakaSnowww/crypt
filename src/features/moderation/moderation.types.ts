import type { Database } from '../../types/database';

type Functions = Database['public']['Functions'];

export type ServerAuditLog = Functions['get_server_audit_logs']['Returns'][number];
export type ServerBan = Functions['get_server_bans']['Returns'][number];
export type ServerModerationSettings =
  Functions['get_server_moderation_settings']['Returns'][number];
export type ServerReport = Functions['get_server_reports']['Returns'][number];

export type ModerationReason = {
  profileId: string;
  reason: string;
};
