import { applicationScheme } from './applicationProtocol.js';

export function isTrustedApplicationUrl(value: string, developmentServerUrl?: string) {
  try {
    const candidate = new URL(value);
    if (
      candidate.protocol === `${applicationScheme}:` &&
      candidate.hostname === 'app' &&
      !candidate.username &&
      !candidate.password &&
      !candidate.port
    ) {
      return true;
    }

    if (!developmentServerUrl || candidate.username || candidate.password) return false;
    return candidate.origin === new URL(developmentServerUrl).origin;
  } catch {
    return false;
  }
}

export function isAllowedExternalUrl(value: string) {
  try {
    const candidate = new URL(value);
    return (
      ['http:', 'https:'].includes(candidate.protocol) && !candidate.username && !candidate.password
    );
  } catch {
    return false;
  }
}

export function isAllowedCryptDeepLink(value: string) {
  try {
    const candidate = new URL(value);
    if (
      candidate.protocol !== 'crypt:' ||
      candidate.username ||
      candidate.password ||
      candidate.port
    ) {
      return false;
    }

    if (candidate.hostname === 'auth') {
      return candidate.pathname === '/callback';
    }

    if (candidate.hostname === 'invite') {
      const parts = candidate.pathname.split('/').filter(Boolean);
      return (
        parts.length === 1 &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(parts[0])
      );
    }

    return false;
  } catch {
    return false;
  }
}
