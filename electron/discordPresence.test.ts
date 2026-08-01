import { describe, expect, it } from 'vitest';
import { decodeDiscordFrames, encodeDiscordFrame } from './discordPresence.js';

describe('Discord Rich Presence', () => {
  it('codifica e decodifica quadros do protocolo IPC', () => {
    const frame = encodeDiscordFrame(0, {
      client_id: '123456789012345678',
      v: 1,
    });
    const decoded = decodeDiscordFrames(frame);

    expect(decoded.remaining).toHaveLength(0);
    expect(decoded.frames).toEqual([
      {
        opcode: 0,
        payload: {
          client_id: '123456789012345678',
          v: 1,
        },
      },
    ]);
  });

  it('preserva um quadro incompleto para a próxima leitura', () => {
    const frame = encodeDiscordFrame(1, { cmd: 'SET_ACTIVITY' });
    const firstRead = decodeDiscordFrames(frame.subarray(0, 10));

    expect(firstRead.frames).toHaveLength(0);
    expect(firstRead.remaining).toHaveLength(10);
  });
});
