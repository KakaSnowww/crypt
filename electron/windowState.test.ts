import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultWindowState, loadWindowState, saveWindowState } from './windowState.js';

let temporaryDirectory = '';
let stateFile = '';

beforeEach(() => {
  temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'crypt-window-state-'));
  stateFile = path.join(temporaryDirectory, 'window-state.json');
});

afterEach(() => {
  rmSync(temporaryDirectory, { force: true, recursive: true });
});

describe('estado da janela do Electron', () => {
  it('salva e restaura tamanho, posição e maximização', () => {
    const state = {
      height: 760,
      maximized: true,
      width: 1200,
      x: 140,
      y: 90,
    };

    saveWindowState(stateFile, state);

    expect(loadWindowState(stateFile)).toEqual(state);
  });

  it('ignora arquivos inválidos e usa o tamanho seguro', () => {
    writeFileSync(stateFile, '{"width":"inválido"}', 'utf8');

    expect(loadWindowState(stateFile)).toEqual(defaultWindowState);
  });
});
