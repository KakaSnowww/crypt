import { getSupabaseClient } from '../../lib/supabase/client';
import { toServerOnboardingError } from './serverOnboarding.errors';
import type {
  SaveServerOnboardingInput,
  ServerOnboardingChannel,
  ServerOnboardingRule,
  ServerOnboardingStatus,
} from './serverOnboarding.types';

type UnknownRow = Record<string, unknown>;

type UntypedRpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: unknown;
  }>;
};

function rpcClient() {
  return getSupabaseClient() as unknown as UntypedRpcClient;
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRule(value: unknown): ServerOnboardingRule | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as UnknownRow;
  const ruleId = nullableString(row.rule_id);
  const title = nullableString(row.title);

  if (!ruleId || !title) {
    return null;
  }

  return {
    description: nullableString(row.description),
    position: numberValue(row.position),
    rule_id: ruleId,
    title,
  };
}

function parseChannel(value: unknown): ServerOnboardingChannel | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as UnknownRow;
  const channelId = nullableString(row.channel_id);
  const channelName = nullableString(row.channel_name);
  const channelType =
    row.channel_type === 'voice' || row.channel_type === 'video'
      ? row.channel_type
      : row.channel_type === 'text'
        ? 'text'
        : null;

  if (!channelId || !channelName || !channelType) {
    return null;
  }

  return {
    channel_icon: nullableString(row.channel_icon),
    channel_id: channelId,
    channel_name: channelName,
    channel_type: channelType,
    position: numberValue(row.position),
    topic: nullableString(row.topic),
  };
}

export function parseServerOnboardingStatus(value: unknown): ServerOnboardingStatus | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as UnknownRow;
  const serverId = nullableString(row.server_id);
  const serverName = nullableString(row.server_name);

  if (!serverId || !serverName) {
    return null;
  }

  return {
    banner_path: nullableString(row.banner_path),
    channel_selection_required: row.channel_selection_required === true,
    completed_at: nullableString(row.completed_at),
    enabled_at: nullableString(row.enabled_at),
    featured_channels: Array.isArray(row.featured_channels)
      ? row.featured_channels
          .map(parseChannel)
          .filter((channel): channel is ServerOnboardingChannel => Boolean(channel))
      : [],
    icon_path: nullableString(row.icon_path),
    is_owner: row.is_owner === true,
    onboarding_completed: row.onboarding_completed === true,
    onboarding_enabled: row.onboarding_enabled === true,
    onboarding_required: row.onboarding_required === true,
    rules: Array.isArray(row.rules)
      ? row.rules.map(parseRule).filter((rule): rule is ServerOnboardingRule => Boolean(rule))
      : [],
    rules_required: row.rules_required === true,
    selected_channel_ids: Array.isArray(row.selected_channel_ids)
      ? row.selected_channel_ids.filter((id): id is string => typeof id === 'string')
      : [],
    server_description: nullableString(row.server_description),
    server_id: serverId,
    server_name: serverName,
    settings_version: numberValue(row.settings_version, 1),
    welcome_message: stringValue(row.welcome_message, 'Antes de entrar, conheça este servidor.'),
    welcome_title: stringValue(row.welcome_title, 'Bem-vindo(a)'),
  };
}

export async function fetchServerOnboardingStatus(serverId: string) {
  const { data, error } = await rpcClient().rpc('get_server_onboarding_status', {
    target_server_id: serverId,
  });

  if (error) {
    throw toServerOnboardingError(error);
  }

  const row: unknown = Array.isArray(data) ? (data as unknown[])[0] : data;

  return parseServerOnboardingStatus(row);
}

export async function saveServerOnboardingSettings(
  serverId: string,
  input: SaveServerOnboardingInput,
) {
  const { error } = await rpcClient().rpc('update_server_onboarding_settings', {
    channel_must_be_selected: input.channelSelectionRequired,
    featured_channel_ids: input.featuredChannelIds,
    onboarding_enabled: input.enabled,
    onboarding_welcome_message: input.welcomeMessage.trim(),
    onboarding_welcome_title: input.welcomeTitle.trim(),
    rules_must_be_accepted: input.rulesRequired,
    rules_payload: input.rules.map((rule) => ({
      description: rule.description.trim() || null,
      title: rule.title.trim(),
    })),
    target_server_id: serverId,
  });

  if (error) {
    throw toServerOnboardingError(error);
  }
}

export async function completeServerOnboarding(
  serverId: string,
  acceptedRuleIds: string[],
  selectedChannelIds: string[],
) {
  const { error } = await rpcClient().rpc('complete_server_onboarding', {
    accepted_rule_ids: acceptedRuleIds,
    selected_channel_ids: selectedChannelIds,
    target_server_id: serverId,
  });

  if (error) {
    throw toServerOnboardingError(error);
  }
}
