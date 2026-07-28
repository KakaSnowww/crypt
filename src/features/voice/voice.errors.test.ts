import { describe, expect, it } from 'vitest';
import { toVoiceError } from './voice.errors';

describe('toVoiceError', () => {
  it('traduz a ausência de configuração', async () => {
    const result = await toVoiceError({
      context: { json: () => Promise.resolve({ error: 'livekit_not_configured' }) },
    });
    expect(result.message).toContain('não foi configurado');
  });
});
