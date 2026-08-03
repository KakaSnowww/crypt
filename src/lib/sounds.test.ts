import { afterEach, describe, expect, it } from 'vitest';
import {
  getCryptSoundVolume,
  readCryptSoundPreferences,
  saveCryptSoundPreferences,
  soundPreferencesStorageKey,
} from './sounds';

afterEach(() => window.localStorage.removeItem(soundPreferencesStorageKey));

describe('volume dos sons do Crypt', () => {
  it('mantém notificações e chamadas abaixo do volume máximo', () => {
    expect(getCryptSoundVolume('message')).toBeCloseTo(0.336);
    expect(getCryptSoundVolume('call-join')).toBeLessThan(0.6);
    expect(getCryptSoundVolume('call-leave')).toBeLessThan(0.6);
    expect(getCryptSoundVolume('friend-request')).toBeLessThan(0.6);
    expect(getCryptSoundVolume('update')).toBeLessThan(0.6);
  });

  it('salva o volume geral e as categorias desativadas', () => {
    saveCryptSoundPreferences({ disabled: ['message'], masterVolume: 0.35 });

    expect(readCryptSoundPreferences()).toEqual({
      disabled: ['message'],
      masterVolume: 0.35,
    });
    expect(getCryptSoundVolume('message')).toBeCloseTo(0.147);
  });
});
