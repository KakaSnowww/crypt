import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopUpdateHeaderButton } from './DesktopUpdateHeaderButton';

afterEach(() => {
  delete window.cryptDesktop;
});

describe('DesktopUpdateHeaderButton', () => {
  it('abre os detalhes e instala uma atualização pronta', async () => {
    const user = userEvent.setup();
    const restartAndInstall = vi.fn(() => Promise.resolve(true));
    window.cryptDesktop = createDesktopBridge(restartAndInstall);

    render(<DesktopUpdateHeaderButton />);

    await user.click(await screen.findByRole('button', { name: 'Instalar atualização 0.2.3' }));
    expect(screen.getByText('Uma experiência ainda melhor')).toBeInTheDocument();
    expect(screen.getByText('Botão de atualização no cabeçalho')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reiniciar e instalar' }));
    expect(restartAndInstall).toHaveBeenCalledOnce();
  });
});

function createDesktopBridge(
  restartAndInstall: () => Promise<boolean>,
): NonNullable<Window['cryptDesktop']> {
  const state: CryptDesktopUpdateState = {
    currentVersion: '0.2.2',
    releaseName: 'Uma experiência ainda melhor',
    releaseNotes: '- Botão de atualização no cabeçalho',
    state: 'ready',
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
      restartAndInstall,
    },
  };
}
