import { afterEach, describe, expect, it } from 'vitest';
import {
  getVoiceAudioCaptureOptions,
  isVoiceAudioProfile,
  readVoiceAudioProfile,
  saveVoiceAudioProfile,
} from './voiceAudioProfile';

describe('perfil de áudio da chamada', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('usa Voz limpa por padrão', () => {
    expect(readVoiceAudioProfile()).toBe('voice');
    expect(getVoiceAudioCaptureOptions('voice')).toMatchObject({
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 48_000,
    });
  });

  it('salva e recupera o modo Natural', () => {
    saveVoiceAudioProfile('natural');

    expect(readVoiceAudioProfile()).toBe('natural');
    expect(getVoiceAudioCaptureOptions('natural')).toMatchObject({
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
    });
  });

  it('recusa valores desconhecidos', () => {
    expect(isVoiceAudioProfile('music')).toBe(false);
    expect(isVoiceAudioProfile('voice')).toBe(true);
  });
});
