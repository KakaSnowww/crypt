export type CryptSound = 'call-join' | 'call-leave' | 'friend-request' | 'message' | 'update';

const soundPaths: Record<CryptSound, string> = {
  'call-join': '/som2.mp3',
  'call-leave': '/som3.mp3',
  'friend-request': '/som4.mp3',
  message: '/som1.mp3',
  update: '/som5.mp3',
};

const soundVolumes: Record<CryptSound, number> = {
  'call-join': 0.48,
  'call-leave': 0.46,
  'friend-request': 0.5,
  message: 0.42,
  update: 0.52,
};

export type CryptSoundPreferences = {
  disabled: CryptSound[];
  masterVolume: number;
};

export const soundPreferencesStorageKey = 'crypt:sound-preferences';
export const defaultSoundPreferences: CryptSoundPreferences = {
  disabled: [],
  masterVolume: 0.8,
};

const audioCache = new Map<CryptSound, HTMLAudioElement>();

export function getCryptSoundVolume(sound: CryptSound) {
  return soundVolumes[sound] * readCryptSoundPreferences().masterVolume;
}

export function readCryptSoundPreferences(): CryptSoundPreferences {
  if (typeof window === 'undefined') return defaultSoundPreferences;

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(soundPreferencesStorageKey) ?? 'null',
    ) as Partial<CryptSoundPreferences> | null;
    const masterVolume = Math.min(1, Math.max(0, Number(stored?.masterVolume ?? 0.8)));
    const disabled = Array.isArray(stored?.disabled)
      ? stored.disabled.filter((sound): sound is CryptSound => sound in soundPaths)
      : [];
    return { disabled, masterVolume };
  } catch {
    return defaultSoundPreferences;
  }
}

export function saveCryptSoundPreferences(preferences: CryptSoundPreferences) {
  const normalized = {
    disabled: [...new Set(preferences.disabled)],
    masterVolume: Math.min(1, Math.max(0, preferences.masterVolume)),
  };
  window.localStorage.setItem(soundPreferencesStorageKey, JSON.stringify(normalized));
  return normalized;
}

export async function playCryptSound(sound: CryptSound) {
  if (typeof Audio === 'undefined') return false;

  const preferences = readCryptSoundPreferences();
  if (preferences.disabled.includes(sound) || preferences.masterVolume === 0) return false;

  try {
    const source = new URL(soundPaths[sound], window.location.href).href;
    const audio = audioCache.get(sound) ?? new Audio(source);
    audio.preload = 'auto';
    audio.muted = false;
    audio.volume = getCryptSoundVolume(sound);
    if (audio.readyState > 0) audio.currentTime = 0;
    audioCache.set(sound, audio);

    await audio.play();
    return true;
  } catch (error) {
    console.warn(`O Crypt não conseguiu reproduzir o som ${sound}.`, error);
    return false;
  }
}
