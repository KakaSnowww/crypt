import { describe, expect, it } from 'vitest';
import { parseExperiencePreferences } from './experiencePreferences';

describe('preferências de experiência', () => {
  it('aceita valores conhecidos', () => {
    expect(
      parseExperiencePreferences({
        contrast: 'high',
        textScale: 'large',
        visualMode: 'reduced',
      }),
    ).toEqual({
      contrast: 'high',
      textScale: 'large',
      visualMode: 'reduced',
    });
  });

  it('substitui valores desconhecidos', () => {
    const parsed = parseExperiencePreferences({
      contrast: 'ultra',
      textScale: 'giant',
      visualMode: 'cinematic',
    });

    expect(parsed.contrast).toBe('standard');
    expect(parsed.textScale).toBe('normal');
    expect(['balanced', 'reduced']).toContain(parsed.visualMode);
  });
});
