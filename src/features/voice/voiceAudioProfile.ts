import type { AudioCaptureOptions } from 'livekit-client';

export type VoiceAudioProfile = 'natural' | 'voice';

export const voiceAudioProfiles: ReadonlyArray<{
  description: string;
  id: VoiceAudioProfile;
  label: string;
}> = [
  {
    description:
      'Reduz eco, ruído constante e diferenças bruscas de volume. Recomendado para chamadas.',
    id: 'voice',
    label: 'Voz limpa',
  },
  {
    description:
      'Mantém o som mais próximo do microfone, com menos processamento. Recomendado com fones.',
    id: 'natural',
    label: 'Natural',
  },
];

const storageKey = 'crypt.voice.audio-profile.v1';

export function isVoiceAudioProfile(value: unknown): value is VoiceAudioProfile {
  return value === 'natural' || value === 'voice';
}

export function readVoiceAudioProfile(): VoiceAudioProfile {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isVoiceAudioProfile(stored) ? stored : 'voice';
  } catch {
    return 'voice';
  }
}

export function saveVoiceAudioProfile(profile: VoiceAudioProfile) {
  try {
    window.localStorage.setItem(storageKey, profile);
  } catch {
    // Preferência opcional: a chamada continua funcionando sem armazenamento.
  }
}

export function getVoiceAudioCaptureOptions(profile: VoiceAudioProfile): AudioCaptureOptions {
  const processed = profile === 'voice';

  return {
    autoGainControl: processed,
    channelCount: 1,
    echoCancellation: processed,
    noiseSuppression: processed,
    sampleRate: 48_000,
  };
}

export function getVoiceAudioFallbackOptions(profile: VoiceAudioProfile): AudioCaptureOptions {
  const processed = profile === 'voice';

  return {
    autoGainControl: processed,
    echoCancellation: processed,
    noiseSuppression: processed,
  };
}
