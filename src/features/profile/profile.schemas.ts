import { z } from 'zod';
import { ProfileActionError } from './profile.errors';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_BANNER_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp']);

const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Use pelo menos 2 caracteres.')
  .max(48, 'Use no máximo 48 caracteres.')
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} ._'’()-]*$/u,
    'Use letras, números, espaços e pontuação simples.',
  );

export const profileDetailsSchema = z.object({
  bio: z.string().trim().max(280, 'Use no máximo 280 caracteres.'),
  displayName: displayNameSchema,
});

export const privacySchema = z.object({
  allow_friend_requests: z.boolean(),
  direct_message_policy: z.enum(['anyone', 'friends', 'shared_servers', 'none']),
  discoverable_by_search: z.boolean(),
  hide_all_interests: z.boolean(),
  show_interests_on_profile: z.boolean(),
  show_mutual_friends: z.boolean(),
  show_mutual_servers: z.boolean(),
  show_online_status: z.boolean(),
  use_interests_for_suggestions: z.boolean(),
});

export function parseSpotifyTrackUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'open.spotify.com' ||
    url.port ||
    url.username ||
    url.password
  ) {
    return null;
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  const normalizedParts = pathParts[0]?.startsWith('intl-') ? pathParts.slice(1) : pathParts;

  if (
    normalizedParts.length !== 2 ||
    normalizedParts[0] !== 'track' ||
    !/^[A-Za-z0-9]{22}$/.test(normalizedParts[1] ?? '')
  ) {
    return null;
  }

  const trackId = normalizedParts[1];

  return {
    normalizedUrl: `https://open.spotify.com/track/${trackId}`,
    trackId,
  };
}

export const spotifyTrackSchema = z.object({
  url: z
    .string()
    .trim()
    .superRefine((value, context) => {
      if (!parseSpotifyTrackUrl(value)) {
        context.addIssue({
          code: 'custom',
          message: 'Cole um link válido de uma faixa do Spotify.',
        });
      }
    }),
});

export function validateAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new ProfileActionError('avatar_invalid');
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new ProfileActionError('avatar_too_large');
  }
}

export function validateBannerFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new ProfileActionError('avatar_invalid');
  }

  if (file.size > MAX_BANNER_BYTES) {
    throw new ProfileActionError('banner_too_large');
  }
}

export type PrivacyFormValues = z.infer<typeof privacySchema>;
export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;
export type SpotifyTrackValues = z.infer<typeof spotifyTrackSchema>;
