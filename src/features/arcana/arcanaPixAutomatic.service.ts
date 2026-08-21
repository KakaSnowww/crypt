import { getSupabaseClient } from '../../lib/supabase/client';

export type ArcanaPixPayer = {
  addressNumber: string;
  cpfCnpj: string;
  mobilePhone: string;
  name: string;
  postalCode: string;
};

export type ArcanaPixDetails = {
  authorizationId: null | string;
  exists: boolean;
  expiresAt: null | string;
  payload: null | string;
  status: 'active' | 'cancelled' | 'created' | 'expired' | 'inactive' | 'refused';
};

type PixAction = 'cancel' | 'start' | 'status' | 'sync';

type PixResponse = {
  access_until?: unknown;
  already_active?: unknown;
  authorization_id?: unknown;
  error?: unknown;
  exists?: unknown;
  expires_at?: unknown;
  payload?: unknown;
  status?: unknown;
};

const pixErrors: Record<string, string> = {
  asaas_request_failed: 'O Asaas não conseguiu criar o Pix Automático agora.',
  authentication_required: 'Entre novamente para administrar a assinatura.',
  invalid_asaas_key: 'A chave do Asaas não possui acesso ao Pix Automático.',
  invalid_payer: 'Confira nome, CPF/CNPJ, celular, CEP e número do endereço.',
  invalid_pix_authorization_response: 'O Asaas não retornou o código do Pix Automático.',
  invalid_session: 'Sua sessão expirou. Entre novamente.',
  no_pix_authorization: 'Nenhuma autorização de Pix Automático foi encontrada.',
  origin_not_allowed: 'O Crypt bloqueou uma origem não autorizada.',
  pix_not_configured: 'O Pix Automático ainda não foi configurado no Supabase.',
  pix_not_enabled:
    'O Pix Automático não está liberado nesta conta Asaas. Solicite a habilitação ao Asaas.',
  provider_error: 'Não foi possível administrar o Pix Automático agora.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pixError(value: unknown) {
  const code = typeof value === 'string' ? value : 'provider_error';
  return new Error(pixErrors[code] ?? pixErrors.provider_error);
}

async function invokePix(action: PixAction, payer?: ArcanaPixPayer) {
  const result: unknown = await getSupabaseClient().functions.invoke<PixResponse>(
    'arcana-pix-automatic',
    {
      body: payer ? { action, payer } : { action },
    },
  );

  if (!isRecord(result)) throw pixError('provider_error');

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

    throw pixError(code);
  }

  if (data.error) throw pixError(data.error);
  return data;
}

function normalizeDetails(data: Record<string, unknown>): ArcanaPixDetails {
  const allowedStatuses = new Set([
    'active',
    'cancelled',
    'created',
    'expired',
    'inactive',
    'refused',
  ]);
  const status =
    typeof data.status === 'string' && allowedStatuses.has(data.status) ? data.status : 'inactive';

  return {
    authorizationId: typeof data.authorization_id === 'string' ? data.authorization_id : null,
    exists: data.exists === true || typeof data.authorization_id === 'string',
    expiresAt: typeof data.expires_at === 'string' ? data.expires_at : null,
    payload: typeof data.payload === 'string' ? data.payload : null,
    status: status as ArcanaPixDetails['status'],
  };
}

export async function startArcanaPixAutomatic(payer: ArcanaPixPayer) {
  const data = await invokePix('start', payer);

  return {
    alreadyActive: data.already_active === true,
    details: normalizeDetails(data),
  };
}

export async function getArcanaPixAutomatic() {
  return normalizeDetails(await invokePix('status'));
}

export async function syncArcanaPixAutomatic() {
  return normalizeDetails(await invokePix('sync'));
}

export async function cancelArcanaPixAutomatic() {
  return invokePix('cancel');
}
