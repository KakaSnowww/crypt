import { isElectronRuntime } from './platform';

const internalAppPathPattern = /^\/app(?:\/|$)/;

export function openCryptAppPath(value: string, replace = false) {
  let url: URL;

  try {
    url = new URL(value, window.location.origin);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin || !internalAppPathPattern.test(url.pathname)) {
    return false;
  }

  const target = `${url.pathname}${url.search}${url.hash}`;
  if (replace) {
    window.history.replaceState({}, '', target);
  } else {
    window.history.pushState({}, '', target);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  return true;
}

export function openCryptDeepLink(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return;
  }

  if (url.protocol !== 'crypt:') {
    return;
  }

  if (url.hostname === 'auth' && url.pathname === '/callback') {
    window.history.replaceState({}, '', `/auth/callback${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  if (url.hostname === 'invite') {
    const code = url.pathname.split('/').filter(Boolean)[0];
    if (/^[a-f0-9]{36}$/i.test(code ?? '')) {
      openCryptAppPath(`/app/convite/${code?.toLowerCase()}`);
    }
  }
}

export function configureDesktopDeepLinks() {
  if (!isElectronRuntime() || !window.cryptDesktop) return Promise.resolve();

  window.cryptDesktop.onDeepLink(openCryptDeepLink);
  return Promise.resolve();
}
