import { describe, expect, it } from 'vitest';
import {
  pendingReleaseStorageKey,
  readPendingCryptRelease,
  releaseNoteLines,
  writePendingCryptRelease,
} from './releaseNotes';

describe('releaseNotes', () => {
  it('salva e recupera as notas recebidas antes da instalação', () => {
    writePendingCryptRelease(window.localStorage, {
      releaseName: 'Crypt 0.2.3',
      releaseNotes: '- Atualização mais clara',
      version: '0.2.3',
    });

    expect(readPendingCryptRelease(window.localStorage)).toEqual({
      releaseName: 'Crypt 0.2.3',
      releaseNotes: '- Atualização mais clara',
      version: '0.2.3',
    });
  });

  it('ignora dados corrompidos e limpa a marcação Markdown', () => {
    window.localStorage.setItem(pendingReleaseStorageKey, '{inválido');

    expect(readPendingCryptRelease(window.localStorage)).toBeNull();
    expect(releaseNoteLines('# Novidades\n- Download visível\n* Som novo')).toEqual([
      'Novidades',
      'Download visível',
      'Som novo',
    ]);
  });
});
