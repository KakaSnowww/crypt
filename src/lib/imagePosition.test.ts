import { describe, expect, it } from 'vitest';
import {
  calculateCoverCrop,
  moveImagePosition,
  normalizeImagePosition,
  zoomImagePosition,
} from './imagePosition';

describe('posicionamento de imagem', () => {
  it('recorta foto horizontal usando o ponto escolhido', () => {
    expect(
      calculateCoverCrop(1200, 800, 1, {
        x: 100,
        y: 50,
      }),
    ).toEqual({
      height: 800,
      width: 800,
      x: 400,
      y: 0,
    });
  });

  it('recorta foto vertical para banner', () => {
    expect(
      calculateCoverCrop(900, 1200, 3, {
        x: 50,
        y: 100,
      }),
    ).toEqual({
      height: 300,
      width: 900,
      x: 0,
      y: 900,
    });
  });

  it('limita posição e zoom', () => {
    expect(
      normalizeImagePosition({
        x: -20,
        y: 140,
        zoom: 7,
      }),
    ).toEqual({
      x: 0,
      y: 100,
      zoom: 3,
    });
  });

  it('movimenta e amplia sem sair dos limites', () => {
    expect(
      moveImagePosition(
        {
          x: 95,
          y: 5,
          zoom: 1,
        },
        20,
        -20,
      ),
    ).toMatchObject({
      x: 100,
      y: 0,
    });

    expect(
      zoomImagePosition(
        {
          x: 50,
          y: 50,
          zoom: 2.95,
        },
        0.2,
      ).zoom,
    ).toBe(3);
  });
});
