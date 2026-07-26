import { describe, expect, it } from 'vitest';
import { toConnectionActionError } from './connections.errors';

describe('erros de conexões', () => {
  it('traduz regras protegidas do banco sem expor detalhes internos', () => {
    expect(toConnectionActionError({ message: 'friend_request_exists' }).message).toBe(
      'Já existe um pedido de amizade entre vocês.',
    );
    expect(toConnectionActionError({ message: 'connection_blocked' }).message).toBe(
      'Esta conexão não está disponível por causa de um bloqueio.',
    );
  });

  it('explica quando a migration ainda não foi aplicada', () => {
    expect(
      toConnectionActionError({
        code: 'PGRST202',
        message: 'Could not find the function public.get_my_friends',
      }).code,
    ).toBe('configuration');
  });
});
