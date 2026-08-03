import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playCryptSound } from '../../lib/sounds';
import { DesktopUpdatePanel } from './DesktopUpdatePanel';

vi.mock('../../lib/sounds', () => ({
  playCryptSound: vi.fn(() => Promise.resolve(true)),
}));

afterEach(() => {
  delete window.cryptDesktop;
  vi.clearAllMocks();
});

describe('DesktopUpdatePanel', () => {
  it('mostra a versão também quando o Crypt está aberto no navegador', () => {
    render(<DesktopUpdatePanel />);

    expect(screen.getByText(/Versão atual: 0\.8\.0/)).toBeInTheDocument();
    expect(screen.getByText(/Você está usando o Crypt pelo navegador/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verificar agora' })).not.toBeInTheDocument();
  });

  it('oferece a instalação quando uma atualização está pronta', async () => {
    const restartAndInstall = vi.fn(() => Promise.resolve(true));
    window.cryptDesktop = createDesktopBridge(restartAndInstall);

    render(<DesktopUpdatePanel />);

    expect(await screen.findByText(/Versão 0\.2\.7 pronta\. O Crypt fechará/)).toBeInTheDocument();
    screen.getByRole('button', { name: 'Atualizar e reiniciar 0.2.7' }).click();
    expect(restartAndInstall).toHaveBeenCalledOnce();
  });

  it('permite testar o som de atualização antes da publicação', async () => {
    const user = userEvent.setup();
    window.cryptDesktop = createDesktopBridge(() => Promise.resolve(true));

    render(<DesktopUpdatePanel />);

    await user.click(await screen.findByRole('button', { name: 'Testar som de atualização' }));

    expect(playCryptSound).toHaveBeenCalledWith('update');
    expect(screen.getByText('Som de atualização reproduzido.')).toBeInTheDocument();
  });
});

function createDesktopBridge(
  restartAndInstall: () => Promise<boolean>,
): NonNullable<Window['cryptDesktop']> {
  const state: CryptDesktopUpdateState = {
    currentVersion: '0.2.6',
    state: 'ready',
    version: '0.2.7',
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
