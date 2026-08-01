import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { seenReleaseStorageKey } from './releaseNotes';
import { PostUpdateWhatsNew } from './PostUpdateWhatsNew';

afterEach(() => {
  delete window.cryptDesktop;
  window.localStorage.clear();
});

describe('PostUpdateWhatsNew', () => {
  it('apresenta as mudanças uma vez depois de abrir a versão atualizada', async () => {
    const user = userEvent.setup();
    window.cryptDesktop = createDesktopBridge();

    render(<PostUpdateWhatsNew />);

    expect(
      screen.getByRole('dialog', { name: 'Uma atualização mais próxima de você' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/versão 0\.2\.2/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Começar a usar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(seenReleaseStorageKey)).toBe('0.2.2');
  });
});

function createDesktopBridge(): NonNullable<Window['cryptDesktop']> {
  const state: CryptDesktopUpdateState = {
    currentVersion: '0.2.2',
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
