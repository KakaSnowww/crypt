import { describe, expect, it } from 'vitest';
import { createServersRealtimeTopic } from './useServersRealtime';

describe('createServersRealtimeTopic', () => {
  it('gera um tópico exclusivo para cada assinatura', () => {
    const userId = '10000000-0000-0000-0000-000000000001';
    const serverId = '70000000-0000-0000-0000-000000000001';
    const firstTopic = createServersRealtimeTopic(userId, serverId);
    const secondTopic = createServersRealtimeTopic(userId, serverId);

    expect(firstTopic).not.toBe(secondTopic);
    expect(firstTopic).toContain(`servers:${userId}:${serverId}:`);
    expect(secondTopic).toContain(`servers:${userId}:${serverId}:`);
  });
});
