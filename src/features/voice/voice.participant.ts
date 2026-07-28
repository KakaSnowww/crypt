import type { Participant } from 'livekit-client';

type ParticipantMetadata = {
  avatar_path?: unknown;
  banner_path?: unknown;
  handle?: unknown;
  profile_effect?: unknown;
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
    bannerPath: typeof metadata.banner_path === 'string' ? metadata.banner_path : null,
    displayName: participant.name || participant.identity,
    handle: typeof metadata.handle === 'string' ? metadata.handle : null,
    profileEffect:
      metadata.profile_effect === 'aurora' ||
      metadata.profile_effect === 'neon' ||
      metadata.profile_effect === 'pulse'
        ? metadata.profile_effect
        : 'none',
  };
}
