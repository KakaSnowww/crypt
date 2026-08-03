export type NativeCaptureSourceKind = 'monitor' | 'window';
export type NativeScreenShareQuality = 'arcana' | 'balanced' | 'high';

export type NativeScreenShareOptions = {
  includeSystemAudio: boolean;
  quality: NativeScreenShareQuality;
  source?: NativeCaptureSource;
};

export type NativeScreenSharePreferences = Pick<
  NativeScreenShareOptions,
  'includeSystemAudio' | 'quality'
>;

const qualityStorageKey = 'crypt.screen-share.quality';
const systemAudioStorageKey = 'crypt.screen-share.system-audio';

export type NativeCaptureSource = {
  height: number;
  id: string;
  isPrimary: boolean;
  kind: NativeCaptureSourceKind;
  subtitle: string;
  thumbnailDataUrl: string;
  title: string;
  width: number;
};

export function groupNativeCaptureSources(sources: NativeCaptureSource[]) {
  return {
    monitors: sources.filter((source) => source.kind === 'monitor'),
    windows: sources.filter((source) => source.kind === 'window'),
  };
}

export function getNativeScreenSharePreferences(): NativeScreenSharePreferences {
  const savedQuality = window.localStorage.getItem(qualityStorageKey);
  const savedSystemAudio = window.localStorage.getItem(systemAudioStorageKey);

  return {
    includeSystemAudio: savedSystemAudio !== 'false',
    quality: savedQuality === 'balanced' || savedQuality === 'arcana' ? savedQuality : 'high',
  };
}

export function saveNativeScreenSharePreferences(preferences: NativeScreenSharePreferences) {
  window.localStorage.setItem(qualityStorageKey, preferences.quality);
  window.localStorage.setItem(systemAudioStorageKey, String(preferences.includeSystemAudio));
}

export async function listNativeCaptureSources() {
  const capture = getDesktopCaptureBridge();
  return capture.listSources();
}

export function getNativeCaptureThumbnail(source: NativeCaptureSource) {
  return Promise.resolve(source.thumbnailDataUrl);
}

export async function selectNativeCaptureSource(source: NativeCaptureSource) {
  await getDesktopCaptureBridge().selectSource(source.id);
}

export async function clearNativeCaptureSource() {
  await getDesktopCaptureBridge().clearSelection();
}

function getDesktopCaptureBridge() {
  if (!window.cryptDesktop) {
    throw new Error('A captura direta está disponível somente no aplicativo para Windows.');
  }

  return window.cryptDesktop.capture;
}
