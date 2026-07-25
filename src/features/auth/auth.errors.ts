import { SupabaseConfigurationError } from '../../lib/supabase/client';

export type AuthErrorCode =
  | 'account_exists'
  | 'configuration'
  | 'email_not_confirmed'
  | 'handle_unavailable'
  | 'invalid_credentials'
  | 'invalid_link'
  | 'rate_limit'
  | 'unknown';

const errorMessages: Record<AuthErrorCode, string> = {
  account_exists: 'Já existe uma conta vinculada a este e-mail.',
  configuration: 'O Supabase ainda não foi configurado neste ambiente.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  handle_unavailable: 'Este identificador @ já está em uso. Escolha outro.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  invalid_link: 'Este link é inválido ou expirou. Solicite um novo.',
  rate_limit: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.',
  unknown: 'Não foi possível concluir a ação. Tente novamente.',
};

export class AuthActionError extends Error {
  public readonly code: AuthErrorCode;

  public constructor(code: AuthErrorCode, cause?: unknown) {
    super(errorMessages[code], { cause });
    this.code = code;
    this.name = 'AuthActionError';
  }
}

export function toAuthActionError(error: unknown): AuthActionError {
  if (error instanceof AuthActionError) {
    return error;
  }

  if (error instanceof SupabaseConfigurationError) {
    return new AuthActionError('configuration', error);
  }

  if (typeof error === 'object' && error !== null) {
    const possibleError = error as { code?: string; message?: string; status?: number };
    const code = possibleError.code?.toLocaleLowerCase('en-US') ?? '';
    const message = possibleError.message?.toLocaleLowerCase('en-US') ?? '';

    if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
      return new AuthActionError('invalid_credentials', error);
    }

    if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
      return new AuthActionError('email_not_confirmed', error);
    }

    if (
      possibleError.status === 429 ||
      code.includes('rate_limit') ||
      message.includes('rate limit')
    ) {
      return new AuthActionError('rate_limit', error);
    }

    if (
      code === 'user_already_exists' ||
      message.includes('already registered') ||
      message.includes('already exists')
    ) {
      return new AuthActionError('account_exists', error);
    }

    if (
      code.includes('otp_expired') ||
      code.includes('flow_state') ||
      message.includes('code verifier') ||
      message.includes('expired')
    ) {
      return new AuthActionError('invalid_link', error);
    }
  }

  return new AuthActionError('unknown', error);
}
