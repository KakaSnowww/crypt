import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Rectangle } from 'electron';

export type CryptWindowState = Pick<Rectangle, 'height' | 'width' | 'x' | 'y'> & {
  maximized: boolean;
};

export const defaultWindowState: CryptWindowState = {
  height: 900,
  maximized: false,
  width: 1440,
  x: 80,
  y: 80,
};

export function loadWindowState(filePath: string): CryptWindowState {
  if (!existsSync(filePath)) return defaultWindowState;

  try {
    const candidate = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<CryptWindowState>;
    if (
      !Number.isFinite(candidate.x) ||
      !Number.isFinite(candidate.y) ||
      !Number.isFinite(candidate.width) ||
      !Number.isFinite(candidate.height)
    ) {
      return defaultWindowState;
    }

    return {
      height: Math.max(640, Number(candidate.height)),
      maximized: candidate.maximized === true,
      width: Math.max(940, Number(candidate.width)),
      x: Number(candidate.x),
      y: Number(candidate.y),
    };
  } catch {
    return defaultWindowState;
  }
}

export function saveWindowState(filePath: string, state: CryptWindowState) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(state), 'utf8');
}
