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

  it('explica limites e administração dos grupos privados', () => {
    expect(toDirectMessageError({ message: 'invalid_group_member_count' }).message).toContain(
      '2 a 9',
    );
    expect(toDirectMessageError({ message: 'direct_group_owner_required' }).message).toContain(
      'administrador',
    );
    expect(toDirectMessageError({ message: 'transfer_group_before_leaving' }).message).toContain(
      'Transfira',
    );
  });
});
