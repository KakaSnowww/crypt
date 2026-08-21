import { getSupabaseClient } from '../../lib/supabase/client';

type BillingAction = 'cancel' | 'start' | 'sync';

type BillingResponse = {
  access_until?: unknown;
  already_active?: unknown;
  checkout_url?: unknown;
  error?: unknown;
  status?: unknown;
};

const billingErrors: Record<string, string> = {
  already_active: 'Seu Crypt Pro já está ativo.',
  asaas_not_configured: 'As credenciais do Asaas ainda não foram configuradas.',
  asaas_request_failed: 'O Asaas não conseguiu concluir a solicitação agora.',
  authentication_required: 'Entre novamente para administrar sua assinatura.',
  checkout_in_progress: 'Um checkout já está sendo criado. Aguarde alguns segundos.',
  invalid_session: 'Sua sessão expirou. Entre novamente.',
  no_subscription: 'Nenhuma assinatura do Crypt Pro foi encontrada no Asaas.',
  origin_not_allowed: 'O Crypt bloqueou uma origem não autorizada.',
  provider_error: 'Não foi possível administrar a assinatura agora.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function billingError(value: unknown) {
  const code = typeof value === 'string' ? value : 'provider_error';

  return new Error(billingErrors[code] ?? billingErrors.provider_error);
}

async function invokeArcanaBilling(action: BillingAction) {
  const result: unknown = await getSupabaseClient().functions.invoke<BillingResponse>(
    'arcana-billing',
    {
      body: { action },
    },
  );

  if (!isRecord(result)) {
    throw billingError('provider_error');
  }

  const data = isRecord(result.data) ? result.data : {};
  const error = result.error;

  if (error) {
    let code: unknown;

    try {
      const context = isRecord(error) ? error.context : undefined;
      if (context instanceof Response) {
        const payload: unknown = await context.clone().json();
        code = isRecord(payload) ? payload.error : undefined;
      }
    } catch {
      code = undefined;
    }

    throw billingError(code);
  }

  if (data.error) throw billingError(data.error);
  return data;
}

export async function startArcanaCheckout() {
  const data = await invokeArcanaBilling('start');

  if (data.already_active === true) {
    return { alreadyActive: true, checkoutUrl: null };
  }

  if (typeof data.checkout_url !== 'string') {
    throw billingError('provider_error');
  }

  return {
    alreadyActive: false,
    checkoutUrl: data.checkout_url,
  };
}

export async function syncArcanaBilling() {
  return invokeArcanaBilling('sync');
}

export async function cancelArcanaSubscription() {
  return invokeArcanaBilling('cancel');
}

export function openArcanaCheckout(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw billingError('provider_error');
  }

  const hostname = parsed.hostname.toLocaleLowerCase('en-US');
  const allowedHostname = hostname === 'asaas.com' || hostname.endsWith('.asaas.com');

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !allowedHostname) {
    throw billingError('provider_error');
  }

  const anchor = document.createElement('a');
  anchor.href = parsed.toString();
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
