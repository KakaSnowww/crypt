import { describe, expect, it } from 'vitest';
import { toServerActionError } from './servers.errors';

describe('erros de servidores', () => {
  it('traduz convite expirado', () => {
    expect(toServerActionError({ message: 'server_invite_expired' }).code).toBe('invite_expired');
  });

  it('traduz proteção do proprietário', () => {
    expect(toServerActionError({ message: 'server_owner_must_transfer_or_delete' }).code).toBe(
      'owner_must_transfer',
    );
  });
});
