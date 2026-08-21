const STORAGE_KEY = 'crypt.voice.participant-volume.v1';

export const DEFAULT_PARTICIPANT_VOLUME = 100;
export const MAX_PARTICIPANT_VOLUME = 300;

export function clampParticipantVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PARTICIPANT_VOLUME;
  return Math.min(MAX_PARTICIPANT_VOLUME, Math.max(0, Math.round(value)));
}

export function readParticipantVolumes(storage: Pick<Storage, 'getItem'> | null = getStorage()) {
  if (!storage) return {} as Record<string, number>;

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
        .map(([identity, value]) => [identity, clampParticipantVolume(value as number)]),
    );
  } catch {
    return {} as Record<string, number>;
  }
}

export function saveParticipantVolumes(
  volumes: Record<string, number>,
  storage: Pick<Storage, 'setItem'> | null = getStorage(),
) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(volumes));
}

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}
