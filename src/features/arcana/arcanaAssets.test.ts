import { describe, expect, it } from 'vitest';
import {
  arcanaTierAssets,
  getArcanaTierAsset,
  getCommunityRuneImagePaths,
  normalizeArcanaTierNumber,
} from './arcanaAssets';

describe('arquivos visuais da Arcana', () => {
  it('possui os doze níveis na ordem correta', () => {
    expect(arcanaTierAssets).toHaveLength(12);
    expect(arcanaTierAssets[0]?.imagePath).toBe('/arcana/tiers/arcana-01-centelha.png');
    expect(arcanaTierAssets[11]?.imagePath).toBe('/arcana/tiers/arcana-12-eterno.png');
  });

  it('limita o mês entre um e doze', () => {
    expect(normalizeArcanaTierNumber(0)).toBe(1);
    expect(normalizeArcanaTierNumber(8)).toBe(8);
    expect(normalizeArcanaTierNumber(99)).toBe(12);
    expect(getArcanaTierAsset(5).name).toBe('Éter');
  });

  it('tenta a runa específica antes da runa comum', () => {
    expect(getCommunityRuneImagePaths(2)).toEqual([
      '/arcana/runes/community-rune-02.png',
      '/arcana/runes/community-rune.png',
    ]);
  });
});
