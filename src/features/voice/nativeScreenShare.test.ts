import { beforeEach, describe, expect, it } from 'vitest';
import {
  getNativeScreenSharePreferences,
  groupNativeCaptureSources,
  saveNativeScreenSharePreferences,
  type NativeCaptureSource,
} from './nativeScreenShare';

const sources: NativeCaptureSource[] = [
  {
    height: 1080,
    id: 'screen:0:0',
    isPrimary: true,
    kind: 'monitor',
    subtitle: 'Monitor principal',
    thumbnailDataUrl: 'data:image/png;base64,monitor',
    title: 'Tela principal',
    width: 1920,
  },
  {
    height: 720,
    id: 'window:42:0',
    isPrimary: false,
    kind: 'window',
    subtitle: 'Visual Studio Code',
    thumbnailDataUrl: 'data:image/png;base64,window',
    title: 'Crypt — VoiceStage.tsx',
    width: 1280,
  },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe('groupNativeCaptureSources', () => {
  it('separa telas e janelas sem perder a ordem nativa', () => {
    const grouped = groupNativeCaptureSources(sources);

    expect(grouped.monitors).toEqual([sources[0]]);
    expect(grouped.windows).toEqual([sources[1]]);
  });

  it('salva as preferências de qualidade e áudio do sistema', () => {
    saveNativeScreenSharePreferences({
      includeSystemAudio: false,
      quality: 'balanced',
    });

    expect(getNativeScreenSharePreferences()).toEqual({
      includeSystemAudio: false,
      quality: 'balanced',
    });
  });
});
