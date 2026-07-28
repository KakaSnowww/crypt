import { describe, expect, it } from 'vitest';
import { ProfileActionError } from './profile.errors';
import {
  MAX_AVATAR_BYTES,
  MAX_BANNER_BYTES,
  parseSpotifyTrackUrl,
  profileDetailsSchema,
  privacySchema,
  validateAvatarFile,
  validateBannerFile,
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

  it('permite banner seguro de até 5 MB', () => {
    expect(() =>
      validateBannerFile(new File(['imagem'], 'banner.webp', { type: 'image/webp' })),
    ).not.toThrow();
    expect(() =>
      validateBannerFile(
        new File([new Uint8Array(MAX_BANNER_BYTES + 1)], 'banner.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).toThrow(ProfileActionError);
  });

  it('aceita somente as quatro políticas previstas para novas DMs', () => {
    const base = {
      allow_friend_requests: true,
      discoverable_by_search: true,
      hide_all_interests: false,
      show_interests_on_profile: true,
      show_mutual_friends: true,
      show_mutual_servers: true,
      show_online_status: true,
      use_interests_for_suggestions: true,
    };

    expect(
      ['anyone', 'friends', 'shared_servers', 'none'].every(
        (direct_message_policy) =>
          privacySchema.safeParse({ ...base, direct_message_policy }).success,
      ),
    ).toBe(true);
    expect(
      privacySchema.safeParse({ ...base, direct_message_policy: 'servidor_desconhecido' }).success,
    ).toBe(false);
  });
});
