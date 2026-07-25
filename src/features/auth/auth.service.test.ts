import { describe, expect, it } from 'vitest';
import { getSafeNextPath } from './auth.service';

describe('redirecionamento após autenticação', () => {
  it('mantém apenas destinos internos da área privada', () => {
    expect(getSafeNextPath('/app/conta')).toBe('/app/conta');
    expect(getSafeNextPath('https://example.com')).toBe('/app');
    expect(getSafeNextPath('//example.com')).toBe('/app');
    expect(getSafeNextPath('/login')).toBe('/app');
  });
});
