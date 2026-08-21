import type { Participant } from 'livekit-client';

export type VoiceProfileEffect =
  'aurora' | 'emerald' | 'neon' | 'none' | 'ocean' | 'pulse' | 'sunset';

type ParticipantMetadata = {
  arcana_active?: unknown;
  arcana_tier_color?: unknown;
  arcana_tier_name?: unknown;
  arcana_tier_number?: unknown;
  avatar_path?: unknown;
  avatar_position_x?: unknown;
  avatar_position_y?: unknown;
  avatar_zoom?: unknown;
  banner_path?: unknown;
  banner_position_x?: unknown;
  banner_position_y?: unknown;
  banner_zoom?: unknown;
  handle?: unknown;
  profile_effect?: unknown;
  profile_gradient_angle?: unknown;
  profile_gradient_end?: unknown;
  profile_gradient_start?: unknown;
};

export type VoiceParticipantVisualProfile = {
  avatar_path: null | string;
  avatar_position_x: number;
  avatar_position_y: number;
  avatar_zoom: number;
  banner_path: null | string;
  banner_position_x: number;
  banner_position_y: number;
  banner_zoom: number;
  profile_effect: null | string;
  profile_gradient_angle: number;
  profile_gradient_end: null | string;
  profile_gradient_start: null | string;
};

function metadataRecord(metadataValue: null | string | undefined): ParticipantMetadata {
  if (!metadataValue) return {};

  try {
    const parsed = JSON.parse(metadataValue) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberInRange(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function optionalHexColor(value: unknown) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/iu.test(value) ? value.toUpperCase() : null;
}

function profileEffect(value: unknown): VoiceProfileEffect {
  return value === 'aurora' ||
    value === 'emerald' ||
    value === 'neon' ||
    value === 'ocean' ||
    value === 'pulse' ||
    value === 'sunset'
    ? value
    : 'none';
}

export function parseVoiceParticipantMetadata(metadataValue: null | string | undefined) {
  const metadata = metadataRecord(metadataValue);

  return {
    arcanaActive: metadata.arcana_active === true,
    arcanaTierColor: optionalHexColor(metadata.arcana_tier_color),
    arcanaTierName: optionalString(metadata.arcana_tier_name),
    arcanaTierNumber: numberInRange(metadata.arcana_tier_number, 1, 12, 1),
    avatarPath: optionalString(metadata.avatar_path),
    avatarPositionX: numberInRange(metadata.avatar_position_x, 0, 100, 50),
    avatarPositionY: numberInRange(metadata.avatar_position_y, 0, 100, 50),
    avatarZoom: numberInRange(metadata.avatar_zoom, 1, 3, 1),
    bannerPath: optionalString(metadata.banner_path),
    bannerPositionX: numberInRange(metadata.banner_position_x, 0, 100, 50),
    bannerPositionY: numberInRange(metadata.banner_position_y, 0, 100, 50),
    bannerZoom: numberInRange(metadata.banner_zoom, 1, 3, 1),
    gradientAngle: numberInRange(metadata.profile_gradient_angle, 0, 360, 135),
    gradientEnd: optionalHexColor(metadata.profile_gradient_end),
    gradientStart: optionalHexColor(metadata.profile_gradient_start),
    handle: optionalString(metadata.handle),
    profileEffect: profileEffect(metadata.profile_effect),
  };
}

export function mergeVoiceParticipantVisualMetadata(
  metadataValue: null | string | undefined,
  profile: VoiceParticipantVisualProfile,
) {
  return JSON.stringify({
    ...metadataRecord(metadataValue),
    avatar_path: profile.avatar_path,
    avatar_position_x: profile.avatar_position_x,
    avatar_position_y: profile.avatar_position_y,
    avatar_zoom: profile.avatar_zoom,
    banner_path: profile.banner_path,
    banner_position_x: profile.banner_position_x,
    banner_position_y: profile.banner_position_y,
    banner_zoom: profile.banner_zoom,
    profile_effect: profile.profile_effect ?? 'none',
    profile_gradient_angle: profile.profile_gradient_angle,
    profile_gradient_end: profile.profile_gradient_end,
    profile_gradient_start: profile.profile_gradient_start,
  });
}

export function getVoiceParticipantProfile(participant: Participant) {
  const metadata = parseVoiceParticipantMetadata(participant.metadata);

  return {
    ...metadata,
    displayName: participant.name || participant.identity,
  };
}
