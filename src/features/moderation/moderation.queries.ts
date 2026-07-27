import { useQuery } from '@tanstack/react-query';
import {
  fetchServerAuditLogs,
  fetchServerBans,
  fetchServerModerationSettings,
  fetchServerReports,
} from './moderation.service';

export const moderationKeys = {
  all: (serverId: string) => ['moderation', serverId] as const,
  audit: (serverId: string) => ['moderation', serverId, 'audit'] as const,
  bans: (serverId: string) => ['moderation', serverId, 'bans'] as const,
  reports: (serverId: string) => ['moderation', serverId, 'reports'] as const,
  settings: (serverId: string) => ['moderation', serverId, 'settings'] as const,
};

export function useServerAuditLogs(serverId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerAuditLogs(serverId),
    queryKey: moderationKeys.audit(serverId),
  });
}

export function useServerBans(serverId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerBans(serverId),
    queryKey: moderationKeys.bans(serverId),
  });
}

export function useServerReports(serverId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerReports(serverId),
    queryKey: moderationKeys.reports(serverId),
  });
}

export function useServerModerationSettings(serverId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(serverId),
    queryFn: () => fetchServerModerationSettings(serverId),
    queryKey: moderationKeys.settings(serverId),
  });
}
