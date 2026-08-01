import { describe, expect, it } from 'vitest';
import { isAndroidScreenShareCompanion } from './androidCompanion';

describe('participante auxiliar da transmissão Android', () => {
  it('reconhece a identidade reservada e metadados nativos', () => {
    expect(isAndroidScreenShareCompanion('profile-id:android-screen')).toBe(true);
    expect(
      isAndroidScreenShareCompanion('auxiliar', JSON.stringify({ companion_of: 'profile-id' })),
    ).toBe(true);
  });

  it('não oculta pessoas reais quando os metadados são inválidos', () => {
    expect(isAndroidScreenShareCompanion('profile-id', '{invalido')).toBe(false);
    expect(isAndroidScreenShareCompanion('profile-id', '{}')).toBe(false);
  });
});
