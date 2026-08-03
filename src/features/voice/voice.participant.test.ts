import { describe, expect, it } from 'vitest';
import type { Participant } from 'livekit-client';
import { getVoiceParticipantProfile } from './voice.participant';

function participant(values: Partial<Participant>) {
  return values as Participant;
}

describe('getVoiceParticipantProfile', () => {
  it('usa nome, avatar e identificador enviados no token da chamada', () => {
    expect(
      getVoiceParticipantProfile(
        participant({
          identity: 'profile-id',
          metadata: JSON.stringify({
            avatar_path: 'profile-id/avatar.jpg',
            banner_path: 'profile-id/banner.jpg',
            handle: 'kaiosnow',
            profile_effect: 'aurora',
          }),
          name: 'Kaio Snow',
        }),
      ),
    ).toEqual({
      avatarPath: 'profile-id/avatar.jpg',
      bannerPath: 'profile-id/banner.jpg',
      displayName: 'Kaio Snow',
      handle: 'kaiosnow',
      profileEffect: 'aurora',
    });
  });

  it('mantém os novos temas de cor dentro da chamada', () => {
    expect(
      getVoiceParticipantProfile({
        identity: 'profile-id',
        metadata: JSON.stringify({ profile_effect: 'ocean' }),
        name: 'Kaio',
      } as Participant),
    ).toMatchObject({ profileEffect: 'ocean' });
  });

  it('continua seguro quando os metadados estiverem ausentes ou inválidos', () => {
    expect(
      getVoiceParticipantProfile(
        participant({ identity: 'profile-id', metadata: '{inválido', name: undefined }),
      ),
    ).toEqual({
      avatarPath: null,
      bannerPath: null,
      displayName: 'profile-id',
      handle: null,
      profileEffect: 'none',
    });
  });
});
