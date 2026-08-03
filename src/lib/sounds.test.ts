import { describe, expect, it } from 'vitest';
import { getCryptSoundVolume } from './sounds';

describe('volume dos sons do Crypt', () => {
  it('mantém notificações e chamadas abaixo do volume máximo', () => {
    expect(getCryptSoundVolume('message')).toBe(0.42);
    expect(getCryptSoundVolume('call-join')).toBeLessThan(0.6);
    expect(getCryptSoundVolume('call-leave')).toBeLessThan(0.6);
    expect(getCryptSoundVolume('friend-request')).toBeLessThan(0.6);
    expect(getCryptSoundVolume('update')).toBeLessThan(0.6);
  });
});
