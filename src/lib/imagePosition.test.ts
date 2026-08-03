import { describe, expect, it } from 'vitest';
import { calculateCoverCrop } from './imagePosition';

describe('posicionamento de imagem', () => {
  it('recorta uma foto horizontal para avatar usando o ponto escolhido', () => {
    expect(calculateCoverCrop(1200, 800, 1, { x: 100, y: 50 })).toEqual({
      height: 800,
      width: 800,
      x: 400,
      y: 0,
    });
  });

  it('recorta uma foto vertical para banner respeitando a posição', () => {
    expect(calculateCoverCrop(900, 1200, 3, { x: 50, y: 100 })).toEqual({
      height: 300,
      width: 900,
      x: 0,
      y: 900,
    });
  });
});
