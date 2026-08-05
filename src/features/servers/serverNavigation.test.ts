import { afterEach, describe, expect, it } from 'vitest';
import {
  readRememberedServerChannel,
  rememberServerChannel,
  resolveServerEntryPath,
} from './serverNavigation';

const serverId = '70000000-0000-4000-8000-000000000001';
const defaultChannelId = '71000000-0000-4000-8000-000000000001';
const voiceChannelId = '71000000-0000-4000-8000-000000000002';

const channels = [
  {
    channel_id: defaultChannelId,
    channel_type: 'text',
  },
  {
    channel_id: voiceChannelId,
    channel_type: 'voice',
  },
] as const;

describe('entrada inteligente no servidor', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('abre o canal padrão quando não existe histórico', () => {
    expect(
      resolveServerEntryPath({
        channels: [...channels],
        defaultChannelId,
        serverId,
      }),
    ).toBe(`/app/servidores/${serverId}/canais/${defaultChannelId}`);
  });

  it('prioriza o último canal acessível', () => {
    rememberServerChannel(serverId, voiceChannelId);

    expect(readRememberedServerChannel(serverId)).toBe(voiceChannelId);
    expect(
      resolveServerEntryPath({
        channels: [...channels],
        defaultChannelId,
        serverId,
      }),
    ).toBe(`/app/servidores/${serverId}/chamadas/${voiceChannelId}`);
  });

  it('descarta canal lembrado que deixou de ser visível', () => {
    rememberServerChannel(serverId, voiceChannelId);

    expect(
      resolveServerEntryPath({
        channels: [channels[0]],
        defaultChannelId,
        serverId,
      }),
    ).toBe(`/app/servidores/${serverId}/canais/${defaultChannelId}`);
    expect(readRememberedServerChannel(serverId)).toBeNull();
  });

  it('volta à página geral quando não há canais acessíveis', () => {
    expect(
      resolveServerEntryPath({
        channels: [],
        defaultChannelId: null,
        serverId,
      }),
    ).toBe(`/app/servidores/${serverId}`);
  });
});
