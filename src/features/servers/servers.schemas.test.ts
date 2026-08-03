import { describe, expect, it } from 'vitest';
import { createServerSchema, extractInviteCode, validateServerMediaFile } from './servers.schemas';

describe('schemas de servidores', () => {
  it('normaliza nome e descrição sem destruir maiúsculas ou acentos', () => {
    expect(
      createServerSchema.parse({
        description: '  Um espaço para criar.  ',
        name: '  Órbita do Snow  ',
      }),
    ).toEqual({
      description: 'Um espaço para criar.',
      name: 'Órbita do Snow',
    });
  });

  it('recusa nome curto e descrição longa', () => {
    const result = createServerSchema.safeParse({
      description: 'a'.repeat(501),
      name: 'A',
    });

    expect(result.success).toBe(false);
  });

  it('extrai o código de um link de convite', () => {
    expect(
      extractInviteCode(
        'https://crypt.local/app/convite/abcdefabcdefabcdefabcdefabcdefabcdef?origem=copy',
      ),
    ).toBe('abcdefabcdefabcdefabcdefabcdefabcdef');
  });

  it('aceita GIF como ícone e banner', () => {
    const gif = new File(['gif'], 'servidor.gif', { type: 'image/gif' });

    expect(() => validateServerMediaFile(gif, 'icon')).not.toThrow();
    expect(() => validateServerMediaFile(gif, 'banner')).not.toThrow();
  });
});
