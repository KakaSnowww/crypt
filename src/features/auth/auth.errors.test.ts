import { describe, expect, it } from 'vitest';
import { SupabaseConfigurationError } from '../../lib/supabase/client';
import { toAuthActionError } from './auth.errors';

describe('mensagens seguras de autenticação', () => {
  it('não expõe a mensagem interna de credenciais inválidas', () => {
    const mappedError = toAuthActionError({
      code: 'invalid_credentials',
      message: 'Internal provider details',
    });

    expect(mappedError.message).toBe('E-mail ou senha incorretos.');
  });

  it('traduz ausência de configuração sem revelar valores', () => {
    const mappedError = toAuthActionError(new SupabaseConfigurationError());

    expect(mappedError.message).toBe('O Supabase ainda não foi configurado neste ambiente.');
    expect(mappedError.message).not.toContain('VITE_SUPABASE_PUBLISHABLE_KEY');
  });

  it('distingue o limite de e-mail do bloqueio geral de autenticação', () => {
    const mappedError = toAuthActionError({
      code: 'over_email_send_rate_limit',
      message: 'Email rate limit exceeded',
      status: 429,
    });

    expect(mappedError.code).toBe('email_rate_limit');
    expect(mappedError.message).not.toContain('Aguarde alguns minutos');
  });
});
