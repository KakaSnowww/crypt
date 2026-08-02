import { describe, expect, it } from 'vitest';
import { getOrCreatePushDeviceId, getStoredPushDeviceId, pushTargetPath } from './pushDevices';

describe('pushDevices', () => {
  it('mantém um identificador estável por instalação', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    const first = getOrCreatePushDeviceId(storage);
    expect(getOrCreatePushDeviceId(storage)).toBe(first);
    expect(getStoredPushDeviceId(storage)).toBe(first);
  });

  it('aceita somente destinos internos do aplicativo', () => {
    expect(pushTargetPath({ targetPath: '/app/mensagens/abc' })).toBe('/app/mensagens/abc');
    expect(pushTargetPath({ targetPath: 'https://example.com' })).toBe('/app/notificacoes');
    expect(pushTargetPath(null)).toBe('/app/notificacoes');
  });
});
