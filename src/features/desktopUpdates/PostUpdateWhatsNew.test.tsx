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

    expect(screen.getByRole('dialog', { name: 'Clear Signal' })).toBeInTheDocument();
    expect(
      screen.getByText('O Crypt foi atualizado para a versão 0.11.1. Veja o que ficou diferente.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Começar a usar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(seenReleaseStorageKey)).toBe('0.11.1');
  });
});

function createDesktopBridge(): NonNullable<Window['cryptDesktop']> {
  const state: CryptDesktopUpdateState = {
    currentVersion: '0.3.0',
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
