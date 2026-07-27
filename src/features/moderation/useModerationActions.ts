import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serverKeys } from '../servers/servers.queries';
import { moderationKeys } from './moderation.queries';
import {
  banMember,
  kickMember,
  resolveReport,
  reportMember,
  unbanMember,
  updateModerationSettings,
} from './moderation.service';

export function useModerationActions(serverId: string) {
  const queryClient = useQueryClient();

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: moderationKeys.all(serverId) }),
      queryClient.invalidateQueries({ queryKey: serverKeys.members(serverId) }),
    ]);
  }

  return {
    ban: useMutation({
      mutationFn: ({ profileId, reason }: { profileId: string; reason: string }) =>
        banMember(serverId, profileId, reason),
      onSuccess: refresh,
    }),
    kick: useMutation({
      mutationFn: ({ profileId, reason }: { profileId: string; reason: string }) =>
        kickMember(serverId, profileId, reason),
      onSuccess: refresh,
    }),
    resolve: useMutation({
      mutationFn: ({ reportId, status }: { reportId: string; status: 'dismissed' | 'resolved' }) =>
        resolveReport(reportId, status),
      onSuccess: refresh,
    }),
    report: useMutation({
      mutationFn: ({
        details,
        profileId,
        reason,
      }: {
        details: string;
        profileId: string;
        reason: string;
      }) => reportMember(serverId, profileId, reason, details),
      onSuccess: refresh,
    }),
    saveSettings: useMutation({
      mutationFn: (settings: {
        allow_member_reports: boolean;
        notify_moderators_on_report: boolean;
        require_ban_reason: boolean;
      }) => updateModerationSettings(serverId, settings),
      onSuccess: refresh,
    }),
    unban: useMutation({
      mutationFn: (profileId: string) => unbanMember(serverId, profileId),
      onSuccess: refresh,
    }),
  };
}
