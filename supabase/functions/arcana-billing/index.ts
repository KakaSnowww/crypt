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
};

type SubscriptionRow = {
  canceled_at: null | string;
  checkout_expires_at: null | string;
  consecutive_months: number;
  current_period_ends_at: null | string;
  grace_ends_at: null | string;
  last_payment_at: null | string;
  profile_id: string;
  provider: string;
  provider_checkout_id: null | string;
  provider_checkout_url: null | string;
  provider_subscription_id: null | string;
  started_at: null | string;
  status: string;
};

type AsaasCheckout = {
  customer?: unknown;
  externalReference?: unknown;
  id?: unknown;
  link?: unknown;
  status?: unknown;
  subscription?: unknown;
};

type AsaasSubscription = {
  billingType?: unknown;
  cycle?: unknown;
  customer?: unknown;
  dateCreated?: unknown;
  deleted?: unknown;
  description?: unknown;
  externalReference?: unknown;
  id?: unknown;
  nextDueDate?: unknown;
  status?: unknown;
  value?: unknown;
};

type AsaasPayment = {
  billingType?: unknown;
  clientPaymentDate?: unknown;
  confirmedDate?: unknown;
  creditDate?: unknown;
  customer?: unknown;
  dateCreated?: unknown;
  dueDate?: unknown;
  externalReference?: unknown;
  id?: unknown;
  paymentDate?: unknown;
  status?: unknown;
  subscription?: unknown;
  value?: unknown;
};

type AsaasList<T> = {
  data?: T[];
  hasMore?: unknown;
  limit?: unknown;
  offset?: unknown;
  totalCount?: unknown;
};

type WebhookBody = {
  checkout?: unknown;
  dateCreated?: unknown;
  event?: unknown;
  id?: unknown;
  payment?: unknown;
};

const encoder = new TextEncoder();
const externalReferencePrefix = 'crypt-arcana:';

const approvedPaymentEvents = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);

const failedPaymentEvents = new Set(['PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'PAYMENT_OVERDUE']);

const reversedPaymentEvents = new Set(['PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_REFUNDED']);

const supportedWebhookEvents = new Set([
  'CHECKOUT_CANCELED',
  'CHECKOUT_EXPIRED',
  'CHECKOUT_PAID',
  'PAYMENT_CONFIRMED',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_OVERDUE',
  'PAYMENT_RECEIVED',
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
]);

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

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnlyValue(value: unknown) {
  const text = stringValue(value);

  return text && /^\d{4}-\d{2}-\d{2}$/u.test(text) ? text : null;
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

function callbackUrl(path: 'cancel' | 'expired' | 'success' | 'webhook') {
  return `${requiredSecret('SUPABASE_URL')}/functions/v1/arcana-billing/${path}`;
}

function externalReference(profileId: string, attemptId?: string) {
  return `${externalReferencePrefix}${profileId}` + (attemptId ? `:${attemptId}` : '');
}

function profileIdFromReference(value: unknown) {
  const reference = stringValue(value);

  if (!reference?.startsWith(externalReferencePrefix)) {
    return null;
  }

  const profileId = reference.split(':')[1];

  return profileId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(profileId)
    ? profileId
    : null;
}

function formatSaoPauloDateTime(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return (
    `${parts.year}-${parts.month}-${parts.day} ` + `${parts.hour}:${parts.minute}:${parts.second}`
  );
}

function adminClient() {
  return createClient(requiredSecret('SUPABASE_URL'), serviceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authenticateRequest(request: Request, origin: string) {
  const publishableKeys = readKeyDictionary('SUPABASE_PUBLISHABLE_KEYS');
  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (legacyAnonKey) {
    publishableKeys.push(legacyAnonKey);
  }

  const apiKey = request.headers.get('apikey');

  if (!apiKey || !publishableKeys.includes(apiKey)) {
    return {
      error: json(origin, 401, {
        error: 'invalid_api_key',
      }),
    } as const;
  }

  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return {
      error: json(origin, 401, {
        error: 'authentication_required',
      }),
    } as const;
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
    return {
      error: json(origin, 401, {
        error: 'invalid_session',
      }),
    } as const;
  }

  return { user } as const;
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
    console.error('arcana-billing Asaas request failed', {
      path,
      status: response.status,
      body: isRecord(body) ? (body.errors ?? 'unknown') : 'unknown',
    });

    throw new Error(`asaas_request_failed:${response.status}`);
  }

  return body as T;
}

async function readSubscription(admin: AdminClient, profileId: string) {
  const { data, error } = await admin
    .from('arcana_subscriptions')
    .select(
      [
        'profile_id',
        'status',
        'provider',
        'provider_customer_id',
        'provider_subscription_id',
        'provider_checkout_id',
        'provider_checkout_url',
        'checkout_expires_at',
        'started_at',
        'current_period_ends_at',
        'consecutive_months',
        'grace_ends_at',
        'canceled_at',
        'last_payment_at',
      ].join(','),
    )
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return data as SubscriptionRow | null;
}

async function readSubscriptionByProviderId(admin: AdminClient, providerSubscriptionId: string) {
  const { data, error } = await admin
    .from('arcana_subscriptions')
    .select(
      [
        'profile_id',
        'status',
        'provider',
        'provider_customer_id',
        'provider_subscription_id',
        'provider_checkout_id',
        'provider_checkout_url',
        'checkout_expires_at',
        'started_at',
        'current_period_ends_at',
        'consecutive_months',
        'grace_ends_at',
        'canceled_at',
        'last_payment_at',
      ].join(','),
    )
    .eq('provider', 'asaas')
    .eq('provider_subscription_id', providerSubscriptionId)
    .maybeSingle();

  if (error) throw error;
  return data as SubscriptionRow | null;
}

async function fetchCheckout(checkoutId: string) {
  return asaasRequest<AsaasCheckout>(`/checkouts/${encodeURIComponent(checkoutId)}`);
}

async function fetchSubscription(subscriptionId: string) {
  return asaasRequest<AsaasSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

async function listSubscriptionsByReference(reference: string) {
  return asaasRequest<AsaasList<AsaasSubscription>>(
    `/subscriptions?externalReference=${encodeURIComponent(reference)}&limit=100&offset=0`,
  );
}

async function listSubscriptionPayments(subscriptionId: string) {
  return asaasRequest<AsaasList<AsaasPayment>>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/payments?limit=100&offset=0`,
  );
}

async function hasActiveArcana(admin: AdminClient, profileId: string) {
  const { data, error } = await admin.rpc('has_active_arcana', {
    target_profile_id: profileId,
  });

  if (error) throw error;
  return data === true;
}

async function attachSubscription(
  admin: AdminClient,
  subscription: AsaasSubscription,
  expectedProfileId?: string,
  checkoutId?: null | string,
) {
  const subscriptionId = stringValue(subscription.id);
  const reference = stringValue(subscription.externalReference);
  const referencedProfileId = profileIdFromReference(reference);
  const profileId = expectedProfileId ?? referencedProfileId;

  if (!subscriptionId || !profileId) {
    throw new Error('subscription_profile_not_found');
  }

  if (expectedProfileId && referencedProfileId && expectedProfileId !== referencedProfileId) {
    throw new Error('subscription_profile_mismatch');
  }

  const current = await readSubscription(admin, profileId);
  const providerInactive = stringValue(subscription.status)?.toUpperCase() === 'INACTIVE';
  const status = current?.status === 'active' ? 'active' : providerInactive ? 'paused' : 'pending';

  const { error } = await admin.from('arcana_subscriptions').upsert(
    {
      profile_id: profileId,
      provider: 'asaas',
      provider_checkout_id: checkoutId ?? undefined,
      provider_customer_id: stringValue(subscription.customer),
      provider_subscription_id: subscriptionId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  );

  if (error) throw error;

  return {
    profileId,
    subscriptionId,
  };
}

async function findAndAttachSubscription(
  admin: AdminClient,
  profileId: string,
  reference: string,
  checkoutId?: null | string,
) {
  const listed = await listSubscriptionsByReference(reference);
  const subscriptions = Array.isArray(listed.data) ? listed.data : [];
  const candidate = subscriptions
    .filter((item) => stringValue(item.id))
    .sort((left, right) =>
      String(right.dateCreated ?? '').localeCompare(String(left.dateCreated ?? '')),
    )[0];

  if (!candidate) return null;

  return attachSubscription(admin, candidate, profileId, checkoutId);
}

async function resolveSubscriptionForPayment(admin: AdminClient, payment: AsaasPayment) {
  const providerSubscriptionId = stringValue(payment.subscription);

  if (!providerSubscriptionId) {
    return null;
  }

  const existing = await readSubscriptionByProviderId(admin, providerSubscriptionId);

  if (existing) return existing;

  const subscription = await fetchSubscription(providerSubscriptionId);
  const attached = await attachSubscription(admin, subscription);

  return readSubscription(admin, attached.profileId);
}

function paymentEventStatus(eventType: string) {
  if (approvedPaymentEvents.has(eventType)) {
    return 'approved';
  }

  if (failedPaymentEvents.has(eventType)) {
    return 'past_due';
  }

  if (reversedPaymentEvents.has(eventType)) {
    return 'reversed';
  }

  return 'pending';
}

async function processPaymentEvent(admin: AdminClient, eventType: string, payment: AsaasPayment) {
  const paymentId = stringValue(payment.id);
  const providerSubscriptionId = stringValue(payment.subscription);

  if (!paymentId || !providerSubscriptionId) {
    return;
  }

  const subscription = await resolveSubscriptionForPayment(admin, payment);

  if (!subscription) return;

  const amount = numberValue(payment.value);
  const expectedAmount = monthlyPrice();

  if (amount === null || Math.abs(amount - expectedAmount) > 0.001) {
    throw new Error('payment_amount_mismatch');
  }

  const status = paymentEventStatus(eventType);
  const dueDate = dateOnlyValue(payment.dueDate);
  const confirmedAt =
    dateValue(payment.confirmedDate) ??
    dateValue(payment.paymentDate) ??
    dateValue(payment.clientPaymentDate) ??
    (status === 'approved' ? new Date().toISOString() : null);
  const receivedAt = dateValue(payment.creditDate);

  const { data: previous, error: previousError } = await admin
    .from('arcana_billing_payments')
    .select('status')
    .eq('provider_payment_id', paymentId)
    .maybeSingle();

  if (previousError) throw previousError;

  const { error: paymentError } = await admin.from('arcana_billing_payments').upsert(
    {
      amount,
      billing_type: stringValue(payment.billingType),
      confirmed_at: status === 'approved' ? confirmedAt : null,
      currency: 'BRL',
      due_date: dueDate,
      profile_id: subscription.profile_id,
      provider_checkout_id: subscription.provider_checkout_id,
      provider_invoice_id: paymentId,
      provider_payment_id: paymentId,
      provider_subscription_id: providerSubscriptionId,
      received_at: receivedAt,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'provider_payment_id' },
  );

  if (paymentError) throw paymentError;

  if (status === 'approved' && previous?.status !== 'approved') {
    const providerSubscription = await fetchSubscription(providerSubscriptionId);
    const nextDueDate = dateOnlyValue(providerSubscription.nextDueDate);
    const currentPeriodEnd = nextDueDate
      ? new Date(`${nextDueDate}T23:59:59-03:00`).toISOString()
      : addOneMonth(confirmedAt ?? new Date().toISOString());
    const previousPaymentDate = subscription.last_payment_at
      ? new Date(subscription.last_payment_at).getTime()
      : 0;
    const currentPaymentDate = new Date(confirmedAt ?? new Date().toISOString()).getTime();
    const continuesJourney =
      previousPaymentDate > 0 &&
      currentPaymentDate - previousPaymentDate <= 45 * 24 * 60 * 60 * 1000;
    const consecutiveMonths = continuesJourney ? subscription.consecutive_months + 1 : 1;

    const { error: activateError } = await admin
      .from('arcana_subscriptions')
      .update({
        canceled_at: null,
        checkout_expires_at: null,
        consecutive_months: consecutiveMonths,
        current_period_ends_at: currentPeriodEnd,
        current_period_started_at: confirmedAt ?? new Date().toISOString(),
        grace_ends_at: null,
        last_payment_at: confirmedAt ?? new Date().toISOString(),
        last_payment_status: 'approved',
        provider_customer_id: stringValue(providerSubscription.customer),
        started_at: subscription.started_at ?? confirmedAt ?? new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', subscription.profile_id)
      .eq('provider_subscription_id', providerSubscriptionId);

    if (activateError) throw activateError;
    return;
  }

  if (status === 'past_due') {
    const threeDayGrace = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const graceEndsAt = maxDate(subscription.current_period_ends_at, threeDayGrace);

    const { error } = await admin
      .from('arcana_subscriptions')
      .update({
        grace_ends_at: graceEndsAt,
        last_payment_status: 'past_due',
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', subscription.profile_id);

    if (error) throw error;
    return;
  }

  if (status === 'reversed') {
    const { error } = await admin
      .from('arcana_subscriptions')
      .update({
        current_period_ends_at: new Date().toISOString(),
        grace_ends_at: null,
        last_payment_status: 'reversed',
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', subscription.profile_id);

    if (error) throw error;
  }
}

async function processCheckoutEvent(
  admin: AdminClient,
  eventType: string,
  checkout: AsaasCheckout,
) {
  const checkoutId = stringValue(checkout.id);
  const reference = stringValue(checkout.externalReference);
  const profileId = profileIdFromReference(reference);

  if (!checkoutId || !profileId) return;

  if (eventType === 'CHECKOUT_PAID') {
    const attached = await findAndAttachSubscription(admin, profileId, reference!, checkoutId);

    const { error } = await admin.from('arcana_subscriptions').upsert(
      {
        checkout_expires_at: null,
        profile_id: profileId,
        provider: 'asaas',
        provider_checkout_id: checkoutId,
        provider_checkout_url: stringValue(checkout.link),
        status: attached ? 'pending' : 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );

    if (error) throw error;

    if (attached) {
      await synchronize(admin, profileId, true);
    }
    return;
  }

  if (eventType === 'CHECKOUT_CANCELED' || eventType === 'CHECKOUT_EXPIRED') {
    const existing = await readSubscription(admin, profileId);

    if (existing?.status === 'active') return;

    const { error } = await admin.from('arcana_subscriptions').upsert(
      {
        checkout_expires_at: null,
        profile_id: profileId,
        provider: 'asaas',
        provider_checkout_id: checkoutId,
        provider_checkout_url: null,
        status: 'inactive',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );

    if (error) throw error;
  }
}

async function startCheckout(admin: AdminClient, profileId: string) {
  if (await hasActiveArcana(admin, profileId)) {
    return { already_active: true };
  }

  const existing = await readSubscription(admin, profileId);
  const checkoutStillActive =
    existing?.provider === 'asaas' &&
    existing.status === 'pending' &&
    existing.provider_checkout_url &&
    existing.checkout_expires_at &&
    new Date(existing.checkout_expires_at).getTime() > Date.now();

  if (checkoutStillActive) {
    return {
      checkout_url: existing.provider_checkout_url!,
      status: 'pending',
    };
  }

  if (
    existing?.status === 'pending' &&
    !existing.provider_checkout_id &&
    existing.checkout_started_at &&
    new Date(existing.checkout_started_at).getTime() > Date.now() - 2 * 60 * 1000
  ) {
    throw new Error('checkout_in_progress');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const attemptId = crypto.randomUUID();
  const reference = externalReference(profileId, attemptId);

  const { error: pendingError } = await admin.from('arcana_subscriptions').upsert(
    {
      checkout_expires_at: expiresAt.toISOString(),
      checkout_started_at: now.toISOString(),
      profile_id: profileId,
      provider: 'asaas',
      provider_checkout_id: null,
      provider_checkout_url: null,
      status: 'pending',
      updated_at: now.toISOString(),
    },
    { onConflict: 'profile_id' },
  );

  if (pendingError) throw pendingError;

  const checkout = await asaasRequest<AsaasCheckout>('/checkouts', {
    body: JSON.stringify({
      billingTypes: ['CREDIT_CARD'],
      callback: {
        cancelUrl: callbackUrl('cancel'),
        expiredUrl: callbackUrl('expired'),
        successUrl: callbackUrl('success'),
      },
      chargeTypes: ['RECURRENT'],
      externalReference: reference,
      items: [
        {
          description: 'Assinatura premium mensal do aplicativo Crypt',
          externalReference: 'crypt-arcana-monthly',
          name: 'Arcana do Crypt',
          quantity: 1,
          value: monthlyPrice(),
        },
      ],
      minutesToExpire: 60,
      subscription: {
        cycle: 'MONTHLY',
        nextDueDate: formatSaoPauloDateTime(new Date(Date.now() + 5 * 60 * 1000)),
      },
    }),
    method: 'POST',
  });

  const checkoutId = stringValue(checkout.id);
  const checkoutUrl = stringValue(checkout.link);

  if (!checkoutId || !checkoutUrl) {
    throw new Error('invalid_checkout_response');
  }

  const { error } = await admin
    .from('arcana_subscriptions')
    .update({
      provider_checkout_id: checkoutId,
      provider_checkout_url: checkoutUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('profile_id', profileId)
    .eq('provider', 'asaas');

  if (error) throw error;

  return {
    checkout_url: checkoutUrl,
    status: 'pending',
  };
}

async function synchronize(
  admin: AdminClient,
  profileId: string,
  allowPendingWithoutSubscription = false,
) {
  let subscription = await readSubscription(admin, profileId);

  if (!subscription || subscription.provider !== 'asaas') {
    throw new Error('no_subscription');
  }

  if (!subscription.provider_subscription_id && subscription.provider_checkout_id) {
    const checkout = await fetchCheckout(subscription.provider_checkout_id);
    const reference = stringValue(checkout.externalReference);

    if (reference) {
      await findAndAttachSubscription(
        admin,
        profileId,
        reference,
        subscription.provider_checkout_id,
      );
      subscription = await readSubscription(admin, profileId);
    }
  }

  if (!subscription?.provider_subscription_id) {
    if (allowPendingWithoutSubscription || subscription?.provider_checkout_id) {
      return { status: 'pending' };
    }

    throw new Error('no_subscription');
  }

  const providerSubscription = await fetchSubscription(subscription.provider_subscription_id);

  await attachSubscription(
    admin,
    providerSubscription,
    profileId,
    subscription.provider_checkout_id,
  );

  const payments = await listSubscriptionPayments(subscription.provider_subscription_id);

  for (const payment of payments.data ?? []) {
    const providerStatus = stringValue(payment.status)?.toUpperCase();
    let eventType = 'PAYMENT_CREATED';

    if (providerStatus === 'CONFIRMED' || providerStatus === 'RECEIVED') {
      eventType = providerStatus === 'RECEIVED' ? 'PAYMENT_RECEIVED' : 'PAYMENT_CONFIRMED';
    } else if (providerStatus === 'OVERDUE') {
      eventType = 'PAYMENT_OVERDUE';
    } else if (providerStatus === 'REFUNDED' || providerStatus === 'REFUND_REQUESTED') {
      eventType = 'PAYMENT_REFUNDED';
    }

    await processPaymentEvent(admin, eventType, payment);
  }

  const updated = await readSubscription(admin, profileId);

  return {
    status: updated?.status ?? 'inactive',
  };
}

async function cancelSubscription(admin: AdminClient, profileId: string) {
  const subscription = await readSubscription(admin, profileId);

  if (!subscription || subscription.provider !== 'asaas') {
    throw new Error('no_subscription');
  }

  if (subscription.provider_subscription_id) {
    await asaasRequest<JsonObject>(
      `/subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`,
      { method: 'DELETE' },
    );
  } else if (subscription.provider_checkout_id) {
    await asaasRequest<JsonObject>(
      `/checkouts/${encodeURIComponent(subscription.provider_checkout_id)}`,
      { method: 'DELETE' },
    );
  } else {
    throw new Error('no_subscription');
  }

  const canceledAt = new Date().toISOString();
  const { error } = await admin
    .from('arcana_subscriptions')
    .update({
      canceled_at: canceledAt,
      provider_checkout_url: null,
      status: 'canceled',
      updated_at: canceledAt,
    })
    .eq('profile_id', profileId)
    .eq('provider', 'asaas');

  if (error) throw error;

  return {
    access_until: subscription.current_period_ends_at,
    status: 'canceled',
  };
}

function returnPage(result: 'cancel' | 'expired' | 'success') {
  const destination = 'crypt://arcana/callback?status=return';
  const destinationJson = JSON.stringify(destination).replaceAll('<', '\\u003c');
  const title =
    result === 'success'
      ? 'Checkout concluído'
      : result === 'expired'
        ? 'Checkout expirado'
        : 'Checkout cancelado';
  const message =
    result === 'success'
      ? 'O Crypt consultará o Asaas antes de liberar a Arcana.'
      : 'Você pode voltar ao Crypt e iniciar um novo checkout quando quiser.';
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />
  <title>${title}</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#f8fafc;background:#070b16}
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#6d28d966,transparent 44%),#070b16}
    main{width:min(100%,520px);border:1px solid #ffffff18;border-radius:28px;padding:32px;background:#111827ed;box-shadow:0 30px 80px #0008;text-align:center}
    .mark{width:68px;height:68px;margin:auto;display:grid;place-items:center;border-radius:23px;background:#8b5cf622;color:#c4b5fd;font-size:31px}
    h1{margin:22px 0 10px;font-size:28px}p{margin:0;color:#aab4c8;line-height:1.65}
    a{display:inline-flex;margin-top:26px;min-height:46px;align-items:center;justify-content:center;border-radius:16px;padding:0 20px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700}
    small{display:block;margin-top:18px;color:#718096;line-height:1.5}
  </style>
</head>
<body>
  <main>
    <div class="mark">✦</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${destination}">Voltar ao Crypt</a>
    <small>A página de retorno não ativa benefícios sozinha.</small>
  </main>
  <script>
    setTimeout(function(){
      window.location.href=${destinationJson};
    },500);
  </script>
</body>
</html>`;

  return new Response(encoder.encode(html), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Disposition': 'inline; filename="crypt-arcana-return.html"',
      'Content-Type': 'text/html; charset=UTF-8',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
    status: 200,
  });
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

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
  const { error } = await admin.from('arcana_billing_events').upsert(
    {
      error_code: values.errorCode ?? null,
      event_type: values.eventType,
      processed_at: values.processingStatus === 'received' ? null : new Date().toISOString(),
      processing_status: values.processingStatus,
      provider_event_id: values.eventId,
      provider_request_id: values.eventId,
      resource_id: values.resourceId,
    },
    { onConflict: 'provider_event_id' },
  );

  if (error) {
    console.error('arcana-billing webhook audit failed', error);
  }
}

async function handleWebhook(request: Request) {
  const receivedToken = request.headers.get('asaas-access-token');
  const expectedToken = requiredSecret('ASAAS_WEBHOOK_TOKEN');

  if (!receivedToken || !constantTimeEqual(receivedToken, expectedToken)) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const body = await readJsonBody<WebhookBody>(request);
  const eventId = stringValue(body.id);
  const eventType = stringValue(body.event);

  if (!eventId || !eventType || !supportedWebhookEvents.has(eventType)) {
    return new Response('Ignored', { status: 200 });
  }

  const checkout = isRecord(body.checkout) ? (body.checkout as AsaasCheckout) : null;
  const payment = isRecord(body.payment) ? (body.payment as AsaasPayment) : null;
  const resourceId = stringValue(checkout?.id) ?? stringValue(payment?.id) ?? eventId;
  const admin = adminClient();

  const { data: priorEvent } = await admin
    .from('arcana_billing_events')
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
    if (checkout) {
      const checkoutId = stringValue(checkout.id);
      const authoritativeCheckout = checkoutId ? await fetchCheckout(checkoutId) : checkout;

      await processCheckoutEvent(admin, eventType, {
        ...checkout,
        ...authoritativeCheckout,
      });
    }

    if (payment) {
      await processPaymentEvent(admin, eventType, payment);
    }

    await saveWebhookEvent(admin, {
      eventId,
      eventType,
      processingStatus: 'processed',
      resourceId,
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('arcana-billing webhook failed', {
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

    return new Response('Retry later', {
      status: 500,
    });
  }
}

function publicErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.startsWith('missing_secret:')) {
    return 'asaas_not_configured';
  }

  if (message.includes('checkout_in_progress')) {
    return 'checkout_in_progress';
  }

  if (message.includes('no_subscription')) {
    return 'no_subscription';
  }

  if (message.includes('asaas_request_failed')) {
    return 'asaas_request_failed';
  }

  return 'provider_error';
}

Deno.serve(async (request) => {
  const url = new URL(request.url);

  if (request.method === 'GET' && /\/arcana-billing\/success\/?$/u.test(url.pathname)) {
    return returnPage('success');
  }

  if (request.method === 'GET' && /\/arcana-billing\/cancel\/?$/u.test(url.pathname)) {
    return returnPage('cancel');
  }

  if (request.method === 'GET' && /\/arcana-billing\/expired\/?$/u.test(url.pathname)) {
    return returnPage('expired');
  }

  if (request.method === 'POST' && /\/arcana-billing\/webhook\/?$/u.test(url.pathname)) {
    try {
      return await handleWebhook(request);
    } catch (error) {
      console.error('arcana-billing invalid webhook', error);

      return new Response('Invalid notification', {
        status: 400,
      });
    }
  }

  const origin = request.headers.get('Origin') ?? '';

  if (!originIsAllowed(origin, allowedOrigins())) {
    return json('null', 403, {
      error: 'origin_not_allowed',
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(origin),
      status: 204,
    });
  }

  if (request.method !== 'POST') {
    return json(origin, 405, {
      error: 'method_not_allowed',
    });
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
      {
        error: error instanceof RequestBodyError ? error.code : 'invalid_body',
      },
    );
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const admin = adminClient();

  try {
    if (action === 'start') {
      return json(origin, 200, await startCheckout(admin, authentication.user.id));
    }

    if (action === 'sync') {
      return json(origin, 200, await synchronize(admin, authentication.user.id));
    }

    if (action === 'cancel') {
      return json(origin, 200, await cancelSubscription(admin, authentication.user.id));
    }

    return json(origin, 400, {
      error: 'invalid_action',
    });
  } catch (error) {
    console.error(`arcana-billing ${action || 'unknown'} failed`, error);

    return json(origin, 400, {
      error: publicErrorCode(error),
    });
  }
});
