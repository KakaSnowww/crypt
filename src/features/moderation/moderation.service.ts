import { getSupabaseClient } from '../../lib/supabase/client';
import { toModerationError } from './moderation.errors';
import type { ServerModerationSettings } from './moderation.types';

async function rpc<T>(run: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await run;

  if (error) {
    throw toModerationError(error);
  }

  return data;
}

export async function fetchServerAuditLogs(serverId: string) {
  return (
    (await rpc(
      getSupabaseClient().rpc('get_server_audit_logs', {
        result_limit: 100,
        target_server_id: serverId,
      }),
    )) ?? []
  );
}

export async function fetchServerBans(serverId: string) {
  return (
    (await rpc(getSupabaseClient().rpc('get_server_bans', { target_server_id: serverId }))) ?? []
  );
}

export async function fetchServerReports(serverId: string) {
  return (
    (await rpc(
      getSupabaseClient().rpc('get_server_reports', {
        report_status: 'all',
        target_server_id: serverId,
      }),
    )) ?? []
  );
}

export async function fetchServerModerationSettings(serverId: string) {
  const rows = await rpc(
    getSupabaseClient().rpc('get_server_moderation_settings', {
      target_server_id: serverId,
    }),
  );
  return rows?.[0] ?? null;
}

export async function kickMember(serverId: string, profileId: string, reason: string) {
  await rpc(
    getSupabaseClient().rpc('kick_server_member', {
      moderation_reason: reason || null,
      target_profile_id: profileId,
      target_server_id: serverId,
    }),
  );
}

export async function banMember(serverId: string, profileId: string, reason: string) {
  await rpc(
    getSupabaseClient().rpc('ban_server_member', {
      moderation_reason: reason || null,
      target_profile_id: profileId,
      target_server_id: serverId,
    }),
  );
}

export async function unbanMember(serverId: string, profileId: string) {
  await rpc(
    getSupabaseClient().rpc('unban_server_member', {
      moderation_reason: null,
      target_profile_id: profileId,
      target_server_id: serverId,
    }),
  );
}

export async function resolveReport(reportId: string, status: 'dismissed' | 'resolved') {
  await rpc(
    getSupabaseClient().rpc('resolve_server_report', {
      resolution_details: null,
      resolution_status: status,
      target_report_id: reportId,
    }),
  );
}

export async function reportMember(
  serverId: string,
  profileId: string,
  reason: string,
  details: string,
) {
  await rpc(
    getSupabaseClient().rpc('report_server_member', {
      report_details: details || null,
      report_reason: reason,
      target_profile_id: profileId,
      target_server_id: serverId,
    }),
  );
}

export async function updateModerationSettings(
  serverId: string,
  settings: Omit<ServerModerationSettings, 'updated_at'>,
) {
  await rpc(
    getSupabaseClient().rpc('update_server_moderation_settings', {
      ban_reason_required: settings.require_ban_reason,
      report_notifications_enabled: settings.notify_moderators_on_report,
      reports_enabled: settings.allow_member_reports,
      target_server_id: serverId,
    }),
  );
}
