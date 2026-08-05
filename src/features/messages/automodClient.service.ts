import { getSupabaseClient } from '../../lib/supabase/client';
import type { AutoModRuleCode } from '../moderation/automod.types';

type LatestBlock = {
  created_at: string;
  rule_code: AutoModRuleCode;
};

export async function fetchLatestAutoModBlock(
  serverId: string,
  channelId: string,
): Promise<LatestBlock | null> {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: null | unknown;
    }>;
  };
  const { data, error } = await client.rpc('get_my_latest_automod_event', {
    target_channel_id: channelId,
    target_server_id: serverId,
  });

  if (error || !Array.isArray(data)) {
    return null;
  }

  const row = data[0];

  if (!row || typeof row !== 'object' || !('rule_code' in row)) {
    return null;
  }

  const rule = (
    row as {
      rule_code?: unknown;
    }
  ).rule_code;

  if (
    rule !== 'blocked_term' &&
    rule !== 'duplicate_message' &&
    rule !== 'external_link' &&
    rule !== 'invite_link' &&
    rule !== 'mention_limit' &&
    rule !== 'spam_burst'
  ) {
    return null;
  }

  return {
    created_at:
      typeof (
        row as {
          created_at?: unknown;
        }
      ).created_at === 'string'
        ? (
            row as {
              created_at: string;
            }
          ).created_at
        : '',
    rule_code: rule,
  };
}
