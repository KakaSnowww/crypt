import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopUpdatePanel } from './DesktopUpdatePanel';

afterEach(() => {
  delete window.cryptDesktop;
});

describe('DesktopUpdatePanel', () => {
  it('mostra a versão também quando o Crypt está aberto no navegador', () => {
    render(<DesktopUpdatePanel />);

    expect(screen.getByText(/Versão atual: 0\.2\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Você está usando o Crypt pelo navegador/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verificar agora' })).not.toBeInTheDocument();
  });

  it('oferece a instalação quando uma atualização está pronta', async () => {
    const restartAndInstall = vi.fn(() => Promise.resolve(true));
    window.cryptDesktop = createDesktopBridge(restartAndInstall);

    render(<DesktopUpdatePanel />);

    expect(await screen.findByText('Versão 0.2.1 pronta para instalar.')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Reiniciar e instalar 0.2.1' }).click();
    expect(restartAndInstall).toHaveBeenCalledOnce();
  });
});

function createDesktopBridge(
  restartAndInstall: () => Promise<boolean>,
): NonNullable<Window['cryptDesktop']> {
  const state: CryptDesktopUpdateState = {
    currentVersion: '0.2.0',
    state: 'ready',
    version: '0.2.1',
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
