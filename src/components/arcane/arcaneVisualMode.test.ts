import { describe, expect, it } from 'vitest';
import {
  arcaneVisualModeLabel,
  getNextArcaneVisualMode,
  isArcaneVisualMode,
} from './arcaneVisualMode';

describe('modo visual arcano', () => {
  it('alterna entre os três níveis', () => {
    expect(getNextArcaneVisualMode('full')).toBe('balanced');
    expect(getNextArcaneVisualMode('balanced')).toBe('reduced');
    expect(getNextArcaneVisualMode('reduced')).toBe('full');
  });

  it('valida somente modos conhecidos', () => {
    expect(isArcaneVisualMode('full')).toBe(true);
    expect(isArcaneVisualMode('ultra')).toBe(false);
  });

  it('fornece nomes em português', () => {
    expect(arcaneVisualModeLabel('balanced')).toBe('Equilibrado');
  });
});
