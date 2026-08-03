import { describe, expect, it } from 'vitest';
import { toVoiceError } from './voice.errors';

describe('toVoiceError', () => {
  it('traduz a ausência de configuração', async () => {
    const result = await toVoiceError({
      context: { json: () => Promise.resolve({ error: 'livekit_not_configured' }) },
    });
    expect(result.message).toContain('não foi configurado');
  });

  it('recusa um destino de chamada privada inválido', async () => {
    const result = await toVoiceError({
      context: { json: () => Promise.resolve({ error: 'invalid_call_target' }) },
    });
    expect(result.message).toContain('conversa escolhida');
  });
});
