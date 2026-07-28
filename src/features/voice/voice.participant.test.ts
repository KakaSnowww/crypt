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
          metadata: JSON.stringify({ avatar_path: 'profile-id/avatar.jpg', handle: 'kaiosnow' }),
          name: 'Kaio Snow',
        }),
      ),
    ).toEqual({
      avatarPath: 'profile-id/avatar.jpg',
      displayName: 'Kaio Snow',
      handle: 'kaiosnow',
    });
  });

  it('continua seguro quando os metadados estiverem ausentes ou inválidos', () => {
    expect(
      getVoiceParticipantProfile(
        participant({ identity: 'profile-id', metadata: '{inválido', name: undefined }),
      ),
    ).toEqual({
      avatarPath: null,
      displayName: 'profile-id',
      handle: null,
    });
  });
});
