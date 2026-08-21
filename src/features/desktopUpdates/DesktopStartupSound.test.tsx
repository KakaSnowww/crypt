import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playCryptSound } from '../../lib/sounds';
import { DesktopStartupSound } from './DesktopStartupSound';

vi.mock('../../lib/sounds', () => ({
  playCryptSound: vi.fn(() => Promise.resolve(true)),
  playCryptUiSound: vi.fn(),
}));

afterEach(() => {
  delete window.cryptDesktop;
  vi.clearAllMocks();
});

describe('DesktopStartupSound', () => {
  it('toca o som5 quando o aplicativo Windows abre', async () => {
    window.cryptDesktop = createDesktopBridge();

    render(<DesktopStartupSound />);

    await waitFor(() => expect(playCryptSound).toHaveBeenCalledWith('update'));
  });
});

function createDesktopBridge(): NonNullable<Window['cryptDesktop']> {
  const state: CryptDesktopUpdateState = {
    currentVersion: '0.2.6',
    state: 'idle',
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
