import { describe, expect, it, vi } from 'vitest';
import {
  clampParticipantVolume,
  readParticipantVolumes,
  saveParticipantVolumes,
} from './participantVolume';

describe('participantVolume', () => {
  it('limita o volume entre 0% e 300%', () => {
    expect(clampParticipantVolume(-10)).toBe(0);
    expect(clampParticipantVolume(148.7)).toBe(149);
    expect(clampParticipantVolume(999)).toBe(300);
    expect(clampParticipantVolume(Number.NaN)).toBe(100);
  });

  it('ignora preferências inválidas ao restaurar', () => {
    const storage = { getItem: () => JSON.stringify({ kaio: 250, snow: 'alto', x: 500 }) };
    expect(readParticipantVolumes(storage)).toEqual({ kaio: 250, x: 300 });
  });

  it('salva as preferências por identidade', () => {
    const setItem = vi.fn();
    saveParticipantVolumes({ kaio: 180 }, { setItem });
    expect(setItem).toHaveBeenCalledWith(
      'crypt.voice.participant-volume.v1',
      JSON.stringify({ kaio: 180 }),
    );
  });
});
