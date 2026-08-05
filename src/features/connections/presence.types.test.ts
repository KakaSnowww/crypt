import { describe, expect, it } from 'vitest';
import {
  normalizePresenceMode,
  normalizePresenceStatus,
  presenceModeInformation,
} from './presence.types';

describe('presença do Crypt', () => {
  it('aceita os modos persistidos', () => {
    expect(normalizePresenceMode('online')).toBe('online');
    expect(normalizePresenceMode('away')).toBe('away');
    expect(normalizePresenceMode('busy')).toBe('busy');
    expect(normalizePresenceMode('invisible')).toBe('invisible');
  });

  it('usa automático para um modo desconhecido', () => {
    expect(normalizePresenceMode('qualquer')).toBe('automatic');
  });

  it('nunca transforma invisível em um status público', () => {
    expect(presenceModeInformation.invisible.label).toBe('Invisível');
    expect(normalizePresenceStatus('invisible')).toBe('offline');
  });
});
