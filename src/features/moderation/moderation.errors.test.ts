import { describe, expect, it } from 'vitest';
import { toModerationError } from './moderation.errors';

describe('toModerationError', () => {
  it('traduz a proteção de hierarquia', () => {
    expect(toModerationError({ message: 'cannot_moderate_member' }).message).toContain(
      'hierarquia',
    );
  });

  it('não expõe erros internos desconhecidos', () => {
    expect(toModerationError({ message: 'database secret' }).message).toBe(
      'Não foi possível concluir a ação. Tente novamente.',
    );
  });
});
