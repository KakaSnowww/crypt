import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playCryptSound } from '../../lib/sounds';
import { DesktopUpdateBanner } from './DesktopUpdateBanner';
import { updateSoundStorageKey } from './releaseNotes';

vi.mock('../../lib/sounds', () => ({
  playCryptSound: vi.fn(() => Promise.resolve(true)),
  playCryptUiSound: vi.fn(),
}));

afterEach(() => {
  delete window.cryptDesktop;
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('DesktopUpdateBanner', () => {
  it('toca o som5 uma vez quando uma nova versão é encontrada', async () => {
    window.cryptDesktop = createDesktopBridge();

    render(<DesktopUpdateBanner />);

    await waitFor(() => expect(playCryptSound).toHaveBeenCalledWith('update'));
    expect(window.localStorage.getItem(updateSoundStorageKey)).toBe('0.2.3');
  });
});

function createDesktopBridge(): NonNullable<Window['cryptDesktop']> {
  const state: CryptDesktopUpdateState = {
    currentVersion: '0.2.2',
    releaseName: 'Crypt 0.2.3',
    releaseNotes: '- Aviso sonoro de atualização',
    state: 'available',
    version: '0.2.3',
  };

  return {
    capture: {
      clearSelection: () => Promise.resolve(),
      listSources: () => Promise.resolve([]),
      selectSource: () => Promise.resolve(),
    },
    onDeepLink: () => () => undefined,
    updates: {
      check: () => Promise.resolve(state),
      getState: () => Promise.resolve(state),
      onStateChange: () => () => undefined,
      restartAndInstall: () => Promise.resolve(true),
    },
  };
}
