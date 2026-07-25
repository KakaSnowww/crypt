import { describe, expect, it } from 'vitest';
import { ProfileActionError } from './profile.errors';
import {
  MAX_AVATAR_BYTES,
  parseSpotifyTrackUrl,
  profileDetailsSchema,
  validateAvatarFile,
} from './profile.schemas';

describe('validação do perfil', () => {
  it('normaliza um link de faixa do Spotify e remove parâmetros', () => {
    expect(
      parseSpotifyTrackUrl(
        'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=compartilhamento',
      ),
    ).toEqual({
      normalizedUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      trackId: '4uLU6hMCjMI75M1A2tKUQC',
    });
  });

  it('rejeita álbuns, domínios parecidos e protocolos inseguros', () => {
    expect(
      parseSpotifyTrackUrl('https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC'),
    ).toBeNull();
    expect(
      parseSpotifyTrackUrl('https://open.spotify.com.example.com/track/4uLU6hMCjMI75M1A2tKUQC'),
    ).toBeNull();
    expect(parseSpotifyTrackUrl('http://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBeNull();
  });

  it('aceita biografia vazia e limita a 280 caracteres', () => {
    expect(
      profileDetailsSchema.safeParse({
        bio: '',
        displayName: 'Kaio Snow',
      }).success,
    ).toBe(true);
    expect(
      profileDetailsSchema.safeParse({
        bio: 'a'.repeat(281),
        displayName: 'Kaio Snow',
      }).success,
    ).toBe(false);
  });

  it('aceita somente imagens suportadas de até 2 MB', () => {
    expect(() =>
      validateAvatarFile(new File(['imagem'], 'avatar.png', { type: 'image/png' })),
    ).not.toThrow();
    expect(() =>
      validateAvatarFile(new File(['texto'], 'avatar.svg', { type: 'image/svg+xml' })),
    ).toThrow(ProfileActionError);
    expect(() =>
      validateAvatarFile(
        new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'avatar.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).toThrow(ProfileActionError);
  });
});
