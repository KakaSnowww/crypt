import { describe, expect, it } from 'vitest';
import {
  isAllowedLivekitAction,
  isUuid,
  maximumEdgeFunctionBodyBytes,
  originIsAllowed,
  parseAllowedOrigins,
  readJsonBody,
  RequestBodyError,
  secretsMatch,
} from './request-security';

describe('proteções compartilhadas das Edge Functions', () => {
  it('aceita somente ações conhecidas e UUIDs completos', () => {
    expect(isAllowedLivekitAction('join')).toBe(true);
    expect(isAllowedLivekitAction('participants')).toBe(true);
    expect(isAllowedLivekitAction('administrative')).toBe(false);
    expect(isUuid('b44db508-c91c-43f6-85fa-ff847c1cce5b')).toBe(true);
    expect(isUuid('../segredo')).toBe(false);
  });

  it('normaliza origens e compara segredos sem retorno antecipado', () => {
    const origins = parseAllowedOrigins('https://crypt.local/,http://localhost');
    expect(originIsAllowed('https://crypt.local', origins)).toBe(true);
    expect(originIsAllowed('https://evil.example', origins)).toBe(false);
    expect(secretsMatch('segredo-forte', 'segredo-forte')).toBe(true);
    expect(secretsMatch('segredo-fraco', 'segredo-forte')).toBe(false);
  });

  it('recusa corpos JSON maiores que o limite', async () => {
    const request = new Request('https://crypt.local', {
      body: JSON.stringify({ value: 'x'.repeat(maximumEdgeFunctionBodyBytes) }),
      method: 'POST',
    });

    await expect(readJsonBody(request)).rejects.toEqual(
      expect.objectContaining<RequestBodyError>({ code: 'payload_too_large' }),
    );
  });
});
