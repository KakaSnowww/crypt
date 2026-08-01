import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase/client';
import { isNativeRuntime } from '../../lib/platform';
import { AuthActionError, toAuthActionError } from './auth.errors';
import {
  normalizeHandle,
  type AccountDeletionValues,
  type LoginValues,
  type PasswordRecoveryValues,
  type PasswordUpdateValues,
  type RegisterValues,
} from './auth.schemas';

export type RegistrationResult = {
  requiresEmailConfirmation: boolean;
  user: null | User;
};

function isFunctionResponse(value: unknown): value is { error: unknown } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function buildCallbackUrl(nextPath: '/app' | '/redefinir-senha') {
  const callbackUrl = isNativeRuntime()
    ? new URL('crypt://auth/callback')
    : new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('next', nextPath);
  return callbackUrl.toString();
}

export function getSafeNextPath(value: null | string, fallback = '/app') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  if (value !== '/app' && !value.startsWith('/app/')) {
    return fallback;
  }

  return value;
}

export async function registerAccount(values: RegisterValues): Promise<RegistrationResult> {
  const client = getSupabaseClient();
  const handle = normalizeHandle(values.handle);

  const { data: isAvailable, error: availabilityError } = await client.rpc('is_handle_available', {
    candidate_handle: handle,
  });

  if (availabilityError) {
    throw toAuthActionError(availabilityError);
  }

  if (!isAvailable) {
    throw new AuthActionError('handle_unavailable');
  }

  const { data, error } = await client.auth.signUp({
    email: values.email.trim(),
    options: {
      data: {
        display_name: values.displayName.trim(),
        handle,
      },
      emailRedirectTo: buildCallbackUrl('/app'),
    },
    password: values.password,
  });

  if (error) {
    throw toAuthActionError(error);
  }

  if (data.user?.identities?.length === 0) {
    throw new AuthActionError('account_exists');
  }

  return {
    requiresEmailConfirmation: data.session === null,
    user: data.user,
  };
}

export async function loginWithPassword(values: LoginValues): Promise<Session> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: values.email.trim(),
    password: values.password,
  });

  if (error) {
    throw toAuthActionError(error);
  }

  return data.session;
}

export async function requestPasswordRecovery(values: PasswordRecoveryValues) {
  const client = getSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(values.email.trim(), {
    redirectTo: buildCallbackUrl('/redefinir-senha'),
  });

  if (error) {
    throw toAuthActionError(error);
  }
}

export async function completeAuthCallback(code: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    throw toAuthActionError(error);
  }

  return data.session;
}

export async function updatePassword(values: PasswordUpdateValues) {
  const client = getSupabaseClient();
  const { error } = await client.auth.updateUser({
    password: values.password,
  });

  if (error) {
    throw toAuthActionError(error);
  }
}

export async function deleteAccount(email: string, values: AccountDeletionValues) {
  const client = getSupabaseClient();
  const { error: authenticationError } = await client.auth.signInWithPassword({
    email,
    password: values.password,
  });

  if (authenticationError) {
    throw toAuthActionError(authenticationError);
  }

  const functionResult: unknown = await client.functions.invoke<{ deleted: boolean }>(
    'delete-account',
    {
      body: {
        confirmation: values.confirmation,
      },
    },
  );

  if (!isFunctionResponse(functionResult)) {
    throw new AuthActionError('unknown');
  }

  if (functionResult.error) {
    throw toAuthActionError(functionResult.error);
  }

  await client.auth.signOut({ scope: 'local' });
}
