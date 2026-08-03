import { afterEach, describe, expect, it, vi } from 'vitest';
import { openCryptAppPath, openCryptDeepLink } from './desktopDeepLinks';

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('links internos do Crypt', () => {
  it('abre um convite recebido pelo protocolo nativo', () => {
    const popState = vi.fn();
    window.addEventListener('popstate', popState, { once: true });

    openCryptDeepLink('crypt://invite/abcdefabcdefabcdefabcdefabcdefabcdef');

    expect(window.location.pathname).toBe('/app/convite/abcdefabcdefabcdefabcdefabcdefabcdef');
    expect(popState).toHaveBeenCalledOnce();
  });

  it('mantém o retorno de autenticação no fluxo protegido', () => {
    openCryptDeepLink('crypt://auth/callback?code=seguro');

    expect(window.location.pathname).toBe('/auth/callback');
    expect(window.location.search).toBe('?code=seguro');
  });

  it('abre o resultado OAuth somente na tela de contas conectadas', () => {
    openCryptDeepLink(
      'crypt://connections/callback?provider=spotify&status=error&error=access_denied',
    );

    expect(window.location.pathname).toBe('/app/configuracoes/conexoes');
    expect(window.location.search).toBe(
      '?oauth_provider=spotify&oauth_status=error&oauth_error=access_denied',
    );
  });

  it('ignora provedor ou código de erro não permitido', () => {
    openCryptDeepLink('crypt://connections/callback?provider=evil&status=success');
    expect(window.location.pathname).toBe('/');

    openCryptDeepLink(
      'crypt://connections/callback?provider=steam&status=error&error=../../arquivo',
    );
    expect(window.location.pathname).toBe('/app/configuracoes/conexoes');
    expect(window.location.search).toBe('?oauth_provider=steam&oauth_status=error');
  });

  it('recusa destinos externos em notificações', () => {
    expect(openCryptAppPath('https://exemplo.test/app/mensagens')).toBe(false);
    expect(window.location.pathname).toBe('/');
  });
});
