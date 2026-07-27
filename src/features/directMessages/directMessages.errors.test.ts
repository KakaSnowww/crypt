import { describe, expect, it } from 'vitest';
import { toDirectMessageError } from './directMessages.errors';

describe('erros de mensagens privadas', () => {
  it('traduz bloqueio e privacidade sem expor detalhes do banco', () => {
    expect(toDirectMessageError({ message: 'direct_message_blocked' }).message).toContain(
      'bloqueio',
    );
    expect(toDirectMessageError({ message: 'direct_message_not_allowed' }).message).toContain(
      'privacidade',
    );
  });
});
