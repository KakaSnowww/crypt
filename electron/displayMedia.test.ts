import { describe, expect, it } from 'vitest';
import { shouldCaptureSystemAudio } from './displayMedia.js';

describe('áudio da captura nativa', () => {
  it('permite loopback somente ao compartilhar um monitor', () => {
    expect(shouldCaptureSystemAudio('screen:0:0', true)).toBe(true);
    expect(shouldCaptureSystemAudio('window:42:0', true)).toBe(false);
  });

  it('respeita a escolha de transmitir sem áudio', () => {
    expect(shouldCaptureSystemAudio('screen:0:0', false)).toBe(false);
  });
});
