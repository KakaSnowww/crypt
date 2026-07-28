import type { Participant } from 'livekit-client';

type ParticipantMetadata = {
  avatar_path?: unknown;
  handle?: unknown;
};

export function getVoiceParticipantProfile(participant: Participant) {
  let metadata: ParticipantMetadata = {};

  if (participant.metadata) {
    try {
      metadata = JSON.parse(participant.metadata) as ParticipantMetadata;
    } catch {
      metadata = {};
    }
  }

  return {
    avatarPath: typeof metadata.avatar_path === 'string' ? metadata.avatar_path : null,
    displayName: participant.name || participant.identity,
    handle: typeof metadata.handle === 'string' ? metadata.handle : null,
  };
}
