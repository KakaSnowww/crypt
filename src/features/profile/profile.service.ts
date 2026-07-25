import { getSupabaseClient } from '../../lib/supabase/client';
import type { Database } from '../../types/database';
import { ProfileActionError, toProfileActionError } from './profile.errors';
import {
  parseSpotifyTrackUrl,
  validateAvatarFile,
  type PrivacyFormValues,
  type ProfileDetailsValues,
} from './profile.schemas';
import type {
  InterestCategoryWithItems,
  Profile,
  ProfileSettings,
  SpotifyTrackPreview,
} from './profile.types';

const PROFILE_MEDIA_BUCKET = 'profile-media';
const SPOTIFY_FALLBACK_TITLE = 'Faixa favorita no Spotify';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type SettingsUpdate = Database['public']['Tables']['profile_settings']['Update'];

function normalizeNullableText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function fetchCurrentProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw toProfileActionError(error);
  }

  return data;
}

export async function fetchProfileSettings(userId: string): Promise<ProfileSettings> {
  const { data, error } = await getSupabaseClient()
    .from('profile_settings')
    .select('*')
    .eq('profile_id', userId)
    .single();

  if (error) {
    throw toProfileActionError(error);
  }

  return data;
}

export async function fetchInterestCatalog(): Promise<InterestCategoryWithItems[]> {
  const client = getSupabaseClient();
  const [categoryResult, interestResult] = await Promise.all([
    client.from('interest_categories').select('*').order('sort_order'),
    client.from('interests').select('*').order('sort_order'),
  ]);

  if (categoryResult.error) {
    throw toProfileActionError(categoryResult.error);
  }

  if (interestResult.error) {
    throw toProfileActionError(interestResult.error);
  }

  return categoryResult.data.map((category) => ({
    ...category,
    interests: interestResult.data.filter((interest) => interest.category_id === category.id),
  }));
}

export async function fetchSelectedInterestIds(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('profile_interests')
    .select('interest_id')
    .eq('profile_id', userId);

  if (error) {
    throw toProfileActionError(error);
  }

  return data.map((selection) => selection.interest_id);
}

export async function updateProfileRow(userId: string, values: ProfileUpdate) {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update(values)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw toProfileActionError(error);
  }

  return data;
}

export async function saveProfileDetails(userId: string, values: ProfileDetailsValues) {
  return updateProfileRow(userId, {
    bio: normalizeNullableText(values.bio),
    display_name: values.displayName.trim(),
  });
}

export async function updateProfileSettings(userId: string, values: SettingsUpdate) {
  const { data, error } = await getSupabaseClient()
    .from('profile_settings')
    .update(values)
    .eq('profile_id', userId)
    .select('*')
    .single();

  if (error) {
    throw toProfileActionError(error);
  }

  return data;
}

export async function savePrivacySettings(userId: string, values: PrivacyFormValues) {
  return updateProfileSettings(userId, values);
}

export async function saveOnboardingStep(userId: string, onboardingStep: number) {
  return updateProfileSettings(userId, {
    onboarding_step: Math.max(0, Math.min(8, onboardingStep)),
  });
}

export async function completeOnboarding(userId: string) {
  return updateProfileSettings(userId, {
    onboarding_completed_at: new Date().toISOString(),
    onboarding_step: 8,
  });
}

export async function saveInterestCategory(categorySlug: string, interestIds: number[]) {
  const { error } = await getSupabaseClient().rpc('set_profile_interests', {
    category_slug: categorySlug,
    selected_interest_ids: interestIds,
  });

  if (error) {
    throw toProfileActionError(error);
  }
}

export async function replaceAllInterests(interestIds: number[]) {
  const { error } = await getSupabaseClient().rpc('replace_my_interests', {
    selected_interest_ids: interestIds,
  });

  if (error) {
    throw toProfileActionError(error);
  }
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

export function getProfileMediaUrl(path: null | string) {
  if (!path) {
    return null;
  }

  return getSupabaseClient().storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadAvatar(userId: string, file: File, previousPath: null | string) {
  validateAvatarFile(file);

  const client = getSupabaseClient();
  const extension = extensionForMimeType(file.type);
  const path = `${userId}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw toProfileActionError(uploadError);
  }

  try {
    const profile = await updateProfileRow(userId, { avatar_path: path });

    if (previousPath) {
      await client.storage.from(PROFILE_MEDIA_BUCKET).remove([previousPath]);
    }

    return profile;
  } catch (error) {
    await client.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
    throw error;
  }
}

export async function removeAvatar(userId: string, previousPath: string) {
  const profile = await updateProfileRow(userId, { avatar_path: null });
  await getSupabaseClient().storage.from(PROFILE_MEDIA_BUCKET).remove([previousPath]);
  return profile;
}

export function fetchSpotifyTrackPreview(value: string): SpotifyTrackPreview {
  const parsedUrl = parseSpotifyTrackUrl(value);

  if (!parsedUrl) {
    throw new ProfileActionError('spotify_invalid');
  }

  return {
    normalizedUrl: parsedUrl.normalizedUrl,
    thumbnailUrl: null,
    title: SPOTIFY_FALLBACK_TITLE,
    trackId: parsedUrl.trackId,
  };
}

export async function saveFavoriteSpotifyTrack(userId: string, value: string) {
  const preview = fetchSpotifyTrackPreview(value);

  const profile = await updateProfileRow(userId, {
    favorite_spotify_thumbnail_url: preview.thumbnailUrl,
    favorite_spotify_title: preview.title,
    favorite_spotify_url: preview.normalizedUrl,
  });

  return { preview, profile };
}

export async function removeFavoriteSpotifyTrack(userId: string) {
  return updateProfileRow(userId, {
    favorite_spotify_thumbnail_url: null,
    favorite_spotify_title: null,
    favorite_spotify_url: null,
  });
}
