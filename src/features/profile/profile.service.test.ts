import { describe, expect, it } from 'vitest';
import { ProfileActionError } from './profile.errors';
import { fetchSpotifyTrackPreview } from './profile.service';

describe('player oficial do Spotify', () => {
  it('normaliza o link internacional sem depender do oEmbed', () => {
    expect(
      fetchSpotifyTrackPreview(
        'https://open.spotify.com/intl-pt/track/4NLsVn8Gfk65aYNutgE5MD?si=cfe0f0aa0f8743d6',
      ),
    ).toEqual({
      normalizedUrl: 'https://open.spotify.com/track/4NLsVn8Gfk65aYNutgE5MD',
      thumbnailUrl: null,
      title: 'Faixa favorita no Spotify',
      trackId: '4NLsVn8Gfk65aYNutgE5MD',
    });
  });

  it('recusa endereços que não sejam de uma faixa oficial', () => {
    expect(() =>
      fetchSpotifyTrackPreview('https://example.com/track/4NLsVn8Gfk65aYNutgE5MD'),
    ).toThrow(ProfileActionError);
  });
});
