import { describe, expect, it } from 'vitest';
import { buildServerInviteLink } from './mobileShare';

describe('compartilhamento de convite', () => {
  it('mantém um link navegável no navegador', () => {
    expect(buildServerInviteLink('abcdefabcdefabcdefabcdefabcdefabcdef')).toBe(
      `${window.location.origin}/app/convite/abcdefabcdefabcdefabcdefabcdefabcdef`,
    );
  });
});
