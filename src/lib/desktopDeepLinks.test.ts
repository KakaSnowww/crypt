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

  it('recusa destinos externos em notificações', () => {
    expect(openCryptAppPath('https://exemplo.test/app/mensagens')).toBe(false);
    expect(window.location.pathname).toBe('/');
  });
});
