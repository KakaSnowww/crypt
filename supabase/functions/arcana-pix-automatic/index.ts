import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.8';
import {
  originIsAllowed,
  parseAllowedOrigins,
  readJsonBody,
  RequestBodyError,
} from '../_shared/request-security.ts';

type JsonObject = Record<string, unknown>;
type AdminClient = SupabaseClient;

type ActionBody = {
  action?: unknown;
  payer?: unknown;
};

type PayerBody = {
  addressNumber?: unknown;
  cpfCnpj?: unknown;
  mobilePhone?: unknown;
  name?: unknown;
  postalCode?: unknown;
};

type PixRow = {
  conciliation_identifier: null | string;
  pix_expires_at: null | string;
  pix_payload: null | string;
  profile_id: string;
  provider_authorization_id: string;
  provider_customer_id: string;
  provider_subscription_id: null | string;
  status: string;
};

type SubscriptionRow = {
  consecutive_months: number;
  current_period_ends_at: null | string;
  last_payment_at: null | string;
  profile_id: string;
  provider: string;
  provider_subscription_id: null | string;
  started_at: null | string;
  status: string;
};

type WebhookBody = {
  authorization?: unknown;
  dateCreated?: unknown;
  event?: unknown;
  id?: unknown;
  payment?: unknown;
  paymentInstruction?: unknown;
  pixAutomaticAuthorization?: unknown;
};

class AsaasRequestError extends Error {
  public constructor(
    public readonly status: number,
    public readonly providerErrors: unknown,
  ) {
    super(`asaas_request_failed:${status}`);
    this.name = 'AsaasRequestError';
  }
}

const approvedPaymentEvents = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);
const reversedPaymentEvents = new Set(['PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_REFUNDED']);

const supportedWebhookEvents = new Set([
  'PAYMENT_CONFIRMED',
  'PAYMENT_OVERDUE',
  'PAYMENT_RECEIVED',
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CREATED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED',
  'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_CANCELLED',
  'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_CREATED',
  'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED',
  'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_SCHEDULED',
]);

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(text)
    ? text.replace(' ', 'T') + '-03:00'
    : text;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function onlyDigits(value: unknown) {
  return String(value ?? '').replace(/\D/gu, '');
}

function readKeyDictionary(variableName: string): string[] {
  const value = Deno.env.get(variableName);
  if (!value) return [];

  try {
    return Object.values(JSON.parse(value) as Record<string, string>);
  } catch {
    return [];
  }
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`missing_secret:${name}`);
  }

  return value;
}

function serviceRoleKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (legacy) return legacy;

  const keys = readKeyDictionary('SUPABASE_SECRET_KEYS');

  if (!keys.length) {
    throw new Error('missing_secret:SUPABASE_SERVICE_ROLE_KEY');
  }

  return keys[0];
}

function allowedOrigins() {
  return parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  };
}

function json(origin: string, status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders(origin),
    status,
  });
}

function adminClient() {
  return createClient(requiredSecret('SUPABASE_URL'), serviceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function monthlyPrice() {
  const amount = Number.parseFloat(requiredSecret('ARCANA_MONTHLY_PRICE_BRL'));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('invalid_arcana_price');
  }

  return Number(amount.toFixed(2));
}

function asaasBaseUrl() {
  const value = requiredSecret('ASAAS_API_BASE_URL').replace(/\/+$/u, '');

  if (value !== 'https://api-sandbox.asaas.com/v3' && value !== 'https://api.asaas.com/v3') {
    throw new Error('invalid_asaas_base_url');
  }

  return value;
}

async function asaasRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('access_token', requiredSecret('ASAAS_API_KEY'));
  headers.set('accept', 'application/json');
  headers.set('content-type', 'application/json');
  headers.set('user-agent', 'Crypt/0.11.0');

  const response = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const providerErrors = isRecord(body) ? (body.errors ?? body) : body;

    console.error('arcana-pix-automatic Asaas request failed', {
      body: providerErrors,
      path,
      status: response.status,
    });

    throw new AsaasRequestError(response.status, providerErrors);
  }

  return body as T;
}

async function authenticateRequest(request: Request, origin: string) {
  const publishableKeys = readKeyDictionary('SUPABASE_PUBLISHABLE_KEYS');
  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (legacyAnonKey) publishableKeys.push(legacyAnonKey);

  const apiKey = request.headers.get('apikey');

  if (!apiKey || !publishableKeys.includes(apiKey)) {
    return { error: json(origin, 401, { error: 'invalid_api_key' }) } as const;
  }

  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return { error: json(origin, 401, { error: 'authentication_required' }) } as const;
  }

  const client = createClient(requiredSecret('SUPABASE_URL'), apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authorization },
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user?.email) {
    return { error: json(origin, 401, { error: 'invalid_session' }) } as const;
  }

  return { user } as const;
}

function validatePayer(value: unknown) {
  if (!isRecord(value)) throw new Error('invalid_payer');

  const payer = value as PayerBody;
  const name = stringValue(payer.name);
  const cpfCnpj = onlyDigits(payer.cpfCnpj);
  const mobilePhone = onlyDigits(payer.mobilePhone);
  const postalCode = onlyDigits(payer.postalCode);
  const addressNumber = stringValue(payer.addressNumber);

  if (
    !name ||
    name.length < 3 ||
    name.length > 120 ||
    ![11, 14].includes(cpfCnpj.length) ||
    mobilePhone.length < 10 ||
    mobilePhone.length > 11 ||
    postalCode.length !== 8 ||
    !addressNumber ||
    addressNumber.length > 20
  ) {
    throw new Error('invalid_payer');
  }

  return {
    addressNumber,
    cpfCnpj,
    mobilePhone,
    name,
    postalCode,
  };
}

function saoPauloDateOnly(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).format(date);
}

function nextMonthlyStartDate() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return saoPauloDateOnly(date);
}

function addOneMonth(value: string) {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

function maxDate(left: null | string, right: string) {
  if (!left) return right;
  return new Date(left).getTime() > new Date(right).getTime() ? left : right;
}

async function readPix(admin: AdminClient, profileId: string) {
  const { data, error } = await admin
    .from('arcana_pix_authorizations')
    .select(
      [
        'profile_id',
        'provider_customer_id',
        'provider_authorization_id',
        'provider_subscription_id',
        'status',
        'pix_payload',
        'pix_expires_at',
        'conciliation_identifier',
      ].join(','),
    )
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return data as PixRow | null;
}

async function readPixByAuthorization(admin: AdminClient, authorizationId: string) {
  const { data, error } = await admin
    .from('arcana_pix_authorizations')
    .select(
      [
        'profile_id',
        'provider_customer_id',
        'provider_authorization_id',
        'provider_subscription_id',
        'status',
        'pix_payload',
        'pix_expires_at',
        'conciliation_identifier',
      ].join(','),
    )
    .eq('provider_authorization_id', authorizationId)
    .maybeSingle();

  if (error) throw error;
  return data as PixRow | null;
}

async function readSubscription(admin: AdminClient, profileId: string) {
  const { data, error } = await admin
    .from('arcana_subscriptions')
    .select(
      [
        'profile_id',
        'status',
        'provider',
        'provider_subscription_id',
        'started_at',
        'current_period_ends_at',
        'consecutive_months',
        'last_payment_at',
      ].join(','),
    )
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return data as SubscriptionRow | null;
}

async function hasActiveArcana(admin: AdminClient, profileId: string) {
  const { data, error } = await admin.rpc('has_active_arcana', {
    target_profile_id: profileId,
  });

  if (error) throw error;
  return data === true;
}

function authorizationObject(value: unknown) {
  if (!isRecord(value)) return null;
  return value;
}

function authorizationId(value: unknown) {
  if (typeof value === 'string') return stringValue(value);
  if (!isRecord(value)) return null;
  return stringValue(value.id) ?? stringValue(value.authorizationId);
}

function authorizationStatus(value: unknown) {
  if (!isRecord(value)) return null;
  return stringValue(value.status)?.toUpperCase() ?? null;
}

function authorizationPayload(value: unknown) {
  if (!isRecord(value)) return null;

  const immediate = isRecord(value.immediateQrCode) ? value.immediateQrCode : null;

  return (
    stringValue(value.payload) ?? stringValue(value.pixPayload) ?? stringValue(immediate?.payload)
  );
}

function authorizationExpiration(value: unknown) {
  if (!isRecord(value)) return null;
  const immediate = isRecord(value.immediateQrCode) ? value.immediateQrCode : null;

  return dateValue(value.expirationDate) ?? dateValue(immediate?.expirationDate);
}

function authorizationConciliation(value: unknown) {
  if (!isRecord(value)) return null;
  const immediate = isRecord(value.immediateQrCode) ? value.immediateQrCode : null;

  return (
    stringValue(value.conciliationIdentifier) ?? stringValue(immediate?.conciliationIdentifier)
  );
}

function authorizationSubscriptionId(value: unknown) {
  if (!isRecord(value)) return null;
  const subscription = value.subscription;

  return authorizationId(subscription) ?? stringValue(value.subscriptionId);
}

async function findOrCreateCustomer(
  admin: AdminClient,
  profileId: string,
  email: string,
  payer: ReturnType<typeof validatePayer>,
) {
  const current = await readPix(admin, profileId);
  if (current?.provider_customer_id) return current.provider_customer_id;

  const externalReference = `crypt-arcana:${profileId}`;
  const listed = await asaasRequest<{ data?: JsonObject[] }>(
    `/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1&offset=0`,
  );
  const existingId = Array.isArray(listed.data) ? stringValue(listed.data[0]?.id) : null;

  if (existingId) return existingId;

  const customer = await asaasRequest<JsonObject>('/customers', {
    body: JSON.stringify({
      addressNumber: payer.addressNumber,
      cpfCnpj: payer.cpfCnpj,
      email,
      externalReference,
      mobilePhone: payer.mobilePhone,
      name: payer.name,
      notificationDisabled: true,
      postalCode: payer.postalCode,
    }),
    method: 'POST',
  });

  const customerId = stringValue(customer.id);
  if (!customerId) throw new Error('invalid_customer_response');

  return customerId;
}

async function saveAuthorization(
  admin: AdminClient,
  profileId: string,
  customerId: string,
  authorization: JsonObject,
) {
  const id = authorizationId(authorization);
  const payload = authorizationPayload(authorization);
  const expiresAt = authorizationExpiration(authorization);
  const conciliationIdentifier = authorizationConciliation(authorization);
  const subscriptionId = authorizationSubscriptionId(authorization);
  const status = authorizationStatus(authorization)?.toLowerCase() ?? 'created';

  if (!id || !payload) {
    throw new Error('invalid_pix_authorization_response');
  }

  const normalizedStatus = ['active', 'cancelled', 'expired', 'refused'].includes(status)
    ? status
    : 'created';

  const { error: pixError } = await admin.from('arcana_pix_authorizations').upsert(
    {
      conciliation_identifier: conciliationIdentifier,
      pix_expires_at: expiresAt,
      pix_payload: payload,
      profile_id: profileId,
      provider_authorization_id: id,
      provider_customer_id: customerId,
      provider_subscription_id: subscriptionId,
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  );

  if (pixError) throw pixError;

  const now = new Date().toISOString();
  const { error: subscriptionError } = await admin.from('arcana_subscriptions').upsert(
    {
      checkout_expires_at: expiresAt,
      checkout_started_at: now,
      profile_id: profileId,
      provider: 'asaas_pix',
      provider_checkout_id: null,
      provider_checkout_url: null,
      provider_customer_id: customerId,
      provider_subscription_id: id,
      status: normalizedStatus === 'active' ? 'active' : 'pending',
      updated_at: now,
    },
    { onConflict: 'profile_id' },
  );

  if (subscriptionError) throw subscriptionError;

  return {
    authorization_id: id,
    expires_at: expiresAt,
    payload,
    status: normalizedStatus,
  };
}

async function activateAuthorization(
  admin: AdminClient,
  pix: PixRow,
  authoritative?: JsonObject | null,
) {
  const now = new Date().toISOString();
  const subscription = await readSubscription(admin, pix.profile_id);
  const alreadyActive = subscription?.status === 'active';
  const periodEnd =
    alreadyActive && subscription.current_period_ends_at
      ? subscription.current_period_ends_at
      : addOneMonth(now);

  const { error: pixError } = await admin
    .from('arcana_pix_authorizations')
    .update({
      pix_payload: null,
      status: 'active',
      updated_at: now,
      provider_subscription_id:
        authorizationSubscriptionId(authoritative) ?? pix.provider_subscription_id,
    })
    .eq('profile_id', pix.profile_id);

  if (pixError) throw pixError;

  const { error } = await admin.from('arcana_subscriptions').upsert(
    {
      canceled_at: null,
      checkout_expires_at: null,
      consecutive_months: Math.max(1, subscription?.consecutive_months ?? 1),
      current_period_ends_at: periodEnd,
      current_period_started_at: alreadyActive ? undefined : now,
      grace_ends_at: null,
      last_payment_at: subscription?.last_payment_at ?? now,
      last_payment_status: 'approved',
      profile_id: pix.profile_id,
      provider: 'asaas_pix',
      provider_customer_id: pix.provider_customer_id,
      provider_subscription_id: pix.provider_authorization_id,
      started_at: subscription?.started_at ?? now,
      status: 'active',
      updated_at: now,
    },
    { onConflict: 'profile_id' },
  );

  if (error) throw error;
}

async function deactivateAuthorization(
  admin: AdminClient,
  pix: PixRow,
  nextStatus: 'cancelled' | 'expired' | 'refused',
) {
  const now = new Date().toISOString();
  const subscription = await readSubscription(admin, pix.profile_id);
  const keepPaidAccess =
    subscription?.status === 'active' &&
    subscription.current_period_ends_at &&
    new Date(subscription.current_period_ends_at).getTime() > Date.now();

  const { error: pixError } = await admin
    .from('arcana_pix_authorizations')
    .update({
      pix_payload: null,
      status: nextStatus,
      updated_at: now,
    })
    .eq('profile_id', pix.profile_id);

  if (pixError) throw pixError;

  const { error } = await admin
    .from('arcana_subscriptions')
    .update({
      canceled_at: nextStatus === 'cancelled' ? now : null,
      checkout_expires_at: null,
      current_period_ends_at: keepPaidAccess ? subscription.current_period_ends_at : now,
      grace_ends_at: null,
      status: keepPaidAccess && nextStatus === 'cancelled' ? 'canceled' : 'expired',
      updated_at: now,
    })
    .eq('profile_id', pix.profile_id)
    .eq('provider', 'asaas_pix');

  if (error) throw error;
}

async function startPix(admin: AdminClient, profileId: string, email: string, payerValue: unknown) {
  if (await hasActiveArcana(admin, profileId)) {
    return { already_active: true };
  }

  const current = await readPix(admin, profileId);

  if (
    current?.status === 'created' &&
    current.pix_payload &&
    current.pix_expires_at &&
    new Date(current.pix_expires_at).getTime() > Date.now()
  ) {
    return {
      authorization_id: current.provider_authorization_id,
      expires_at: current.pix_expires_at,
      payload: current.pix_payload,
      status: current.status,
    };
  }

  const payer = validatePayer(payerValue);
  const customerId = await findOrCreateCustomer(admin, profileId, email, payer);
  const contractId = `ARCANA-${profileId.replaceAll('-', '').slice(0, 28)}`;
  const authorization = await asaasRequest<JsonObject>('/pix/automatic/authorizations', {
    body: JSON.stringify({
      contractId,
      customerId,
      description: 'Arcana mensal do Crypt',
      frequency: 'MONTHLY',
      immediateQrCode: {},
      paymentCreationMode: 'SUBSCRIPTION',
      retryPolicy: 'ALLOW_THREE_IN_SEVEN_DAYS',
      startDate: nextMonthlyStartDate(),
      value: monthlyPrice(),
    }),
    method: 'POST',
  });

  return saveAuthorization(admin, profileId, customerId, authorization);
}

async function readPixDetails(admin: AdminClient, profileId: string) {
  const pix = await readPix(admin, profileId);

  if (!pix) {
    return {
      exists: false,
      status: 'inactive',
    };
  }

  return {
    authorization_id: pix.provider_authorization_id,
    exists: true,
    expires_at: pix.pix_expires_at,
    payload: pix.status === 'created' ? pix.pix_payload : null,
    status: pix.status,
  };
}

async function synchronizePix(admin: AdminClient, profileId: string) {
  const pix = await readPix(admin, profileId);
  if (!pix) throw new Error('no_pix_authorization');

  const authorization = await asaasRequest<JsonObject>(
    `/pix/automatic/authorizations/${encodeURIComponent(pix.provider_authorization_id)}`,
  );
  const status = authorizationStatus(authorization);

  if (status === 'ACTIVE') {
    await activateAuthorization(admin, pix, authorization);
  } else if (status === 'CANCELLED') {
    await deactivateAuthorization(admin, pix, 'cancelled');
  } else if (status === 'EXPIRED') {
    await deactivateAuthorization(admin, pix, 'expired');
  } else if (status === 'REFUSED') {
    await deactivateAuthorization(admin, pix, 'refused');
  } else {
    const { error } = await admin
      .from('arcana_pix_authorizations')
      .update({
        pix_expires_at: authorizationExpiration(authorization) ?? pix.pix_expires_at,
        pix_payload: authorizationPayload(authorization) ?? pix.pix_payload,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId);

    if (error) throw error;
  }

  return readPixDetails(admin, profileId);
}

async function cancelPix(admin: AdminClient, profileId: string) {
  const pix = await readPix(admin, profileId);
  if (!pix) throw new Error('no_pix_authorization');

  await asaasRequest<JsonObject>(
    `/pix/automatic/authorizations/${encodeURIComponent(pix.provider_authorization_id)}`,
    { method: 'DELETE' },
  );

  await deactivateAuthorization(admin, pix, 'cancelled');
  const subscription = await readSubscription(admin, profileId);

  return {
    access_until: subscription?.current_period_ends_at ?? null,
    status: 'cancelled',
  };
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function saveWebhookEvent(
  admin: AdminClient,
  values: {
    errorCode?: null | string;
    eventId: string;
    eventType: string;
    processingStatus: 'failed' | 'processed' | 'received';
    resourceId: string;
  },
) {
  const { error } = await admin.from('arcana_pix_events').upsert(
    {
      error_code: values.errorCode ?? null,
      event_type: values.eventType,
      processed_at: values.processingStatus === 'received' ? null : new Date().toISOString(),
      processing_status: values.processingStatus,
      provider_event_id: values.eventId,
      resource_id: values.resourceId,
    },
    { onConflict: 'provider_event_id' },
  );

  if (error) console.error('arcana-pix-automatic webhook audit failed', error);
}

function webhookAuthorization(body: WebhookBody) {
  return (
    authorizationObject(body.authorization) ?? authorizationObject(body.pixAutomaticAuthorization)
  );
}

function webhookAuthorizationId(body: WebhookBody) {
  const authorization = webhookAuthorization(body);
  const direct = authorizationId(authorization);

  if (direct) return direct;

  const instruction = isRecord(body.paymentInstruction) ? body.paymentInstruction : null;
  const instructionAuthorization = instruction?.authorization;

  return authorizationId(instructionAuthorization);
}

async function processAuthorizationEvent(admin: AdminClient, eventType: string, body: WebhookBody) {
  const authorization = webhookAuthorization(body);
  const id = webhookAuthorizationId(body);
  if (!id) return;

  const pix = await readPixByAuthorization(admin, id);
  if (!pix) return;

  if (eventType === 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED') {
    await activateAuthorization(admin, pix, authorization);
    return;
  }

  if (eventType === 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED') {
    await deactivateAuthorization(admin, pix, 'cancelled');
    return;
  }

  if (eventType === 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED') {
    await deactivateAuthorization(admin, pix, 'expired');
    return;
  }

  if (eventType === 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED') {
    await deactivateAuthorization(admin, pix, 'refused');
  }
}

async function fetchPayment(value: unknown) {
  if (isRecord(value)) {
    const id = stringValue(value.id);
    if (!id) return value;
    return asaasRequest<JsonObject>(`/payments/${encodeURIComponent(id)}`);
  }

  const id = stringValue(value);
  return id ? asaasRequest<JsonObject>(`/payments/${encodeURIComponent(id)}`) : null;
}

function paymentAuthorizationId(payment: JsonObject) {
  return (
    authorizationId(payment.pixAutomaticAuthorization) ??
    stringValue(payment.pixAutomaticAuthorizationId) ??
    stringValue(payment.automaticPixAuthorizationId)
  );
}

async function processPaymentEvent(admin: AdminClient, eventType: string, body: WebhookBody) {
  if (!body.payment) return;

  const payment = await fetchPayment(body.payment);
  if (!payment) return;

  const paymentId = stringValue(payment.id);
  const authorizationIdValue = paymentAuthorizationId(payment);
  if (!paymentId || !authorizationIdValue) return;

  const pix = await readPixByAuthorization(admin, authorizationIdValue);
  if (!pix) return;

  const subscription = await readSubscription(admin, pix.profile_id);
  if (!subscription || subscription.status !== 'active') return;

  const amount = numberValue(payment.value);
  if (amount !== null && Math.abs(amount - monthlyPrice()) > 0.001) {
    throw new Error('payment_amount_mismatch');
  }

  const { data: prior, error: priorError } = await admin
    .from('arcana_pix_payments')
    .select('status')
    .eq('provider_payment_id', paymentId)
    .maybeSingle();

  if (priorError) throw priorError;

  const approved = approvedPaymentEvents.has(eventType);
  const reversed = reversedPaymentEvents.has(eventType);
  const confirmedAt =
    dateValue(payment.confirmedDate) ??
    dateValue(payment.paymentDate) ??
    dateValue(payment.clientPaymentDate) ??
    (approved ? new Date().toISOString() : null);
  const status = approved ? 'approved' : reversed ? 'reversed' : 'pending';

  const { error: paymentError } = await admin.from('arcana_pix_payments').upsert(
    {
      amount,
      confirmed_at: approved ? confirmedAt : null,
      profile_id: pix.profile_id,
      provider_authorization_id: authorizationIdValue,
      provider_payment_id: paymentId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'provider_payment_id' },
  );

  if (paymentError) throw paymentError;

  if (approved && prior?.status !== 'approved' && confirmedAt) {
    const previousPayment = subscription.last_payment_at
      ? new Date(subscription.last_payment_at).getTime()
      : 0;
    const currentPayment = new Date(confirmedAt).getTime();

    if (previousPayment > 0 && currentPayment - previousPayment >= 20 * 24 * 60 * 60 * 1000) {
      const base = maxDate(subscription.current_period_ends_at, confirmedAt);
      const { error } = await admin
        .from('arcana_subscriptions')
        .update({
          consecutive_months: Math.max(1, subscription.consecutive_months + 1),
          current_period_ends_at: addOneMonth(base),
          current_period_started_at: confirmedAt,
          grace_ends_at: null,
          last_payment_at: confirmedAt,
          last_payment_status: 'approved',
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', pix.profile_id)
        .eq('provider', 'asaas_pix');

      if (error) throw error;
    }
  }

  if (eventType === 'PAYMENT_OVERDUE') {
    const grace = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await admin
      .from('arcana_subscriptions')
      .update({
        grace_ends_at: maxDate(subscription.current_period_ends_at, grace),
        last_payment_status: 'past_due',
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', pix.profile_id)
      .eq('provider', 'asaas_pix');

    if (error) throw error;
  }
}

async function processInstructionEvent(admin: AdminClient, eventType: string, body: WebhookBody) {
  if (eventType !== 'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED') return;

  const id = webhookAuthorizationId(body);
  if (!id) return;

  const pix = await readPixByAuthorization(admin, id);
  if (!pix) return;

  const subscription = await readSubscription(admin, pix.profile_id);
  const grace = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from('arcana_subscriptions')
    .update({
      grace_ends_at: maxDate(subscription?.current_period_ends_at ?? null, grace),
      last_payment_status: 'past_due',
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', pix.profile_id)
    .eq('provider', 'asaas_pix');

  if (error) throw error;
}

async function handleWebhook(request: Request) {
  const receivedToken = request.headers.get('asaas-access-token');
  const expectedToken = requiredSecret('ASAAS_PIX_WEBHOOK_TOKEN');

  if (!receivedToken || !constantTimeEqual(receivedToken, expectedToken)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await readJsonBody<WebhookBody>(request);
  const eventId = stringValue(body.id);
  const eventType = stringValue(body.event);

  if (!eventId || !eventType || !supportedWebhookEvents.has(eventType)) {
    return new Response('Ignored', { status: 200 });
  }

  const resourceId =
    webhookAuthorizationId(body) ??
    stringValue(isRecord(body.payment) ? body.payment.id : body.payment) ??
    eventId;
  const admin = adminClient();

  const { data: priorEvent } = await admin
    .from('arcana_pix_events')
    .select('processing_status')
    .eq('provider_event_id', eventId)
    .maybeSingle();

  if (priorEvent?.processing_status === 'processed') {
    return new Response('OK', { status: 200 });
  }

  await saveWebhookEvent(admin, {
    eventId,
    eventType,
    processingStatus: 'received',
    resourceId,
  });

  try {
    await processAuthorizationEvent(admin, eventType, body);
    await processInstructionEvent(admin, eventType, body);
    await processPaymentEvent(admin, eventType, body);

    await saveWebhookEvent(admin, {
      eventId,
      eventType,
      processingStatus: 'processed',
      resourceId,
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('arcana-pix-automatic webhook failed', {
      error,
      eventId,
      eventType,
      resourceId,
    });

    await saveWebhookEvent(admin, {
      errorCode: error instanceof Error ? error.message.slice(0, 160) : 'provider_error',
      eventId,
      eventType,
      processingStatus: 'failed',
      resourceId,
    });

    return new Response('Retry later', { status: 500 });
  }
}

function publicErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.startsWith('missing_secret:')) return 'pix_not_configured';
  if (message.includes('invalid_payer')) return 'invalid_payer';
  if (message.includes('no_pix_authorization')) return 'no_pix_authorization';
  if (message.includes('invalid_pix_authorization_response')) {
    return 'invalid_pix_authorization_response';
  }

  if (error instanceof AsaasRequestError) {
    if (error.status === 401) return 'invalid_asaas_key';
    if (error.status === 403) return 'pix_not_enabled';
    return 'asaas_request_failed';
  }

  return 'provider_error';
}

Deno.serve(async (request) => {
  const url = new URL(request.url);

  if (request.method === 'POST' && /\/arcana-pix-automatic\/webhook\/?$/u.test(url.pathname)) {
    try {
      return await handleWebhook(request);
    } catch (error) {
      console.error('arcana-pix-automatic invalid webhook', error);
      return new Response('Invalid notification', { status: 400 });
    }
  }

  const origin = request.headers.get('Origin') ?? '';

  if (!originIsAllowed(origin, allowedOrigins())) {
    return json('null', 403, { error: 'origin_not_allowed' });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(origin),
      status: 204,
    });
  }

  if (request.method !== 'POST') {
    return json(origin, 405, { error: 'method_not_allowed' });
  }

  const authentication = await authenticateRequest(request, origin);

  if ('error' in authentication) {
    return authentication.error;
  }

  let body: ActionBody;

  try {
    body = await readJsonBody<ActionBody>(request);
  } catch (error) {
    return json(
      origin,
      error instanceof RequestBodyError && error.code === 'payload_too_large' ? 413 : 400,
      { error: error instanceof RequestBodyError ? error.code : 'invalid_body' },
    );
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const admin = adminClient();

  try {
    if (action === 'start') {
      return json(
        origin,
        200,
        await startPix(admin, authentication.user.id, authentication.user.email, body.payer),
      );
    }

    if (action === 'status') {
      return json(origin, 200, await readPixDetails(admin, authentication.user.id));
    }

    if (action === 'sync') {
      return json(origin, 200, await synchronizePix(admin, authentication.user.id));
    }

    if (action === 'cancel') {
      return json(origin, 200, await cancelPix(admin, authentication.user.id));
    }

    return json(origin, 400, { error: 'invalid_action' });
  } catch (error) {
    console.error(`arcana-pix-automatic ${action || 'unknown'} failed`, error);

    return json(origin, 400, {
      error: publicErrorCode(error),
    });
  }
});
