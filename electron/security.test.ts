import { describe, expect, it } from 'vitest';
import {
  isAllowedCryptDeepLink,
  isAllowedExternalUrl,
  isTrustedApplicationUrl,
} from './security.js';

describe('limites de navegação do Electron', () => {
  it('confia somente no host interno e na origem exata de desenvolvimento', () => {
    expect(isTrustedApplicationUrl('crypt-app://app/app/servidores')).toBe(true);
    expect(isTrustedApplicationUrl('crypt-app://evil/app')).toBe(false);
    expect(isTrustedApplicationUrl('http://127.0.0.1:5173/app', 'http://127.0.0.1:5173')).toBe(
      true,
    );
    expect(
      isTrustedApplicationUrl('http://127.0.0.1:5173.evil.test', 'http://127.0.0.1:5173'),
    ).toBe(false);
  });

  it('abre externamente apenas HTTP sem credenciais embutidas', () => {
    expect(isAllowedExternalUrl('https://sandbox.asaas.com/checkoutSession/show/abc')).toBe(true);
    expect(isAllowedExternalUrl('file:///C:/Windows/system.ini')).toBe(false);
    expect(isAllowedExternalUrl('https://user:password@example.com')).toBe(false);
  });

  it('aceita somente callbacks e convites Crypt válidos', () => {
    expect(isAllowedCryptDeepLink('crypt://auth/callback?code=abc')).toBe(true);
    expect(
      isAllowedCryptDeepLink('crypt://connections/callback?provider=spotify&status=success'),
    ).toBe(true);
    expect(isAllowedCryptDeepLink('crypt://arcana/callback?status=return')).toBe(true);
    expect(isAllowedCryptDeepLink('crypt://arcana/callback?status=approved')).toBe(false);
    expect(isAllowedCryptDeepLink('crypt://invite/b44db508-c91c-43f6-85fa-ff847c1cce5b')).toBe(
      true,
    );
    expect(isAllowedCryptDeepLink('crypt://invite/../../arquivo')).toBe(false);
  });
});
