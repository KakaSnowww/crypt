set lock_timeout = '5s';
set statement_timeout = '90s';

alter table public.arcana_subscriptions
drop constraint if exists arcana_subscriptions_provider_check;

alter table public.arcana_subscriptions
add constraint arcana_subscriptions_provider_check
check (provider in ('manual', 'mercado_pago', 'stripe', 'asaas'));

alter table public.arcana_subscriptions
drop constraint if exists arcana_subscriptions_status_check;

alter table public.arcana_subscriptions
add constraint arcana_subscriptions_status_check
check (
  status in (
    'inactive',
    'pending',
    'trialing',
    'active',
    'past_due',
    'paused',
    'canceled',
    'expired'
  )
);

alter table public.arcana_subscriptions
add column if not exists provider_checkout_id text,
add column if not exists provider_checkout_url text,
add column if not exists checkout_expires_at timestamptz,
add column if not exists checkout_started_at timestamptz,
add column if not exists canceled_at timestamptz,
add column if not exists last_payment_at timestamptz,
add column if not exists last_payment_status text;

alter table public.arcana_subscriptions
drop constraint if exists arcana_subscriptions_checkout_id_check;

alter table public.arcana_subscriptions
add constraint arcana_subscriptions_checkout_id_check
check (
  provider_checkout_id is null
  or char_length(provider_checkout_id) between 1 and 200
);

alter table public.arcana_subscriptions
drop constraint if exists arcana_subscriptions_checkout_url_check;

alter table public.arcana_subscriptions
add constraint arcana_subscriptions_checkout_url_check
check (
  provider_checkout_url is null
  or provider_checkout_url ~ '^https://([a-z0-9-]+\.)*asaas\.com/'
);

create table if not exists public.arcana_billing_payments (
  provider_payment_id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider_subscription_id text not null,
  provider_checkout_id text,
  status text not null,
  billing_type text,
  amount numeric(10, 2) not null,
  currency text not null default 'BRL',
  due_date date,
  confirmed_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arcana_billing_payments_subscription_check
    check (char_length(provider_subscription_id) between 1 and 200),
  constraint arcana_billing_payments_status_check
    check (char_length(status) between 1 and 80),
  constraint arcana_billing_payments_amount_check
    check (amount >= 0),
  constraint arcana_billing_payments_currency_check
    check (currency ~ '^[A-Z]{3}$')
);

alter table public.arcana_billing_payments
add column if not exists provider_invoice_id text,
add column if not exists provider_checkout_id text,
add column if not exists billing_type text,
add column if not exists due_date date,
add column if not exists confirmed_at timestamptz,
add column if not exists received_at timestamptz;

create unique index if not exists arcana_billing_payments_provider_payment_idx
on public.arcana_billing_payments(provider_payment_id);

create index if not exists arcana_billing_payments_profile_idx
on public.arcana_billing_payments(profile_id, due_date desc, created_at desc);

create index if not exists arcana_billing_payments_subscription_idx
on public.arcana_billing_payments(provider_subscription_id, created_at desc);

create table if not exists public.arcana_billing_events (
  provider_event_id text primary key,
  event_type text not null,
  resource_id text not null,
  processing_status text not null default 'received',
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint arcana_billing_events_event_id_check
    check (char_length(provider_event_id) between 1 and 220),
  constraint arcana_billing_events_type_check
    check (char_length(event_type) between 1 and 100),
  constraint arcana_billing_events_resource_check
    check (char_length(resource_id) between 1 and 220),
  constraint arcana_billing_events_processing_check
    check (processing_status in ('received', 'processed', 'failed'))
);

alter table public.arcana_billing_events
add column if not exists provider_request_id text,
add column if not exists provider_event_id text;

create unique index if not exists arcana_billing_events_provider_event_idx
on public.arcana_billing_events(provider_event_id);

create index if not exists arcana_billing_events_received_idx
on public.arcana_billing_events(received_at desc);

alter table public.arcana_billing_payments enable row level security;
alter table public.arcana_billing_payments force row level security;
alter table public.arcana_billing_events enable row level security;
alter table public.arcana_billing_events force row level security;

revoke all on table public.arcana_billing_payments
from public, anon, authenticated;

revoke all on table public.arcana_billing_events
from public, anon, authenticated;

create or replace function public.has_active_arcana(
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.arcana_subscriptions subscription
    where subscription.profile_id = target_profile_id
      and (
        (
          subscription.status in ('active', 'trialing')
          and subscription.current_period_ends_at > now()
        )
        or (
          subscription.status in ('paused', 'canceled')
          and subscription.current_period_ends_at > now()
        )
        or (
          subscription.status = 'past_due'
          and subscription.grace_ends_at > now()
        )
      )
  );
$$;

drop function if exists public.get_my_arcana_membership();

create function public.get_my_arcana_membership()
returns table(
  is_active boolean,
  status text,
  provider text,
  consecutive_months integer,
  tier_number integer,
  tier_name text,
  tier_color text,
  current_period_ends_at timestamptz,
  available_runes integer,
  started_at timestamptz,
  canceled_at timestamptz,
  last_payment_at timestamptz,
  last_payment_status text,
  checkout_expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  subscription_row public.arcana_subscriptions%rowtype;
  used_runes integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into subscription_row
  from public.arcana_subscriptions
  where profile_id = auth.uid();

  select count(*)::integer
  into used_runes
  from public.server_arcana_runes
  where profile_id = auth.uid();

  return query
  select
    public.has_active_arcana(auth.uid()),
    coalesce(subscription_row.status, 'inactive'),
    coalesce(subscription_row.provider, 'manual'),
    coalesce(subscription_row.consecutive_months, 0),
    tier.tier_number,
    tier.tier_name,
    tier.tier_color,
    subscription_row.current_period_ends_at,
    greatest(0, 3 - used_runes),
    subscription_row.started_at,
    subscription_row.canceled_at,
    subscription_row.last_payment_at,
    subscription_row.last_payment_status,
    subscription_row.checkout_expires_at
  from public.get_arcana_tier(
    greatest(1, coalesce(subscription_row.consecutive_months, 1))
  ) tier;
end;
$$;

revoke all on function public.has_active_arcana(uuid)
from public, anon;

revoke all on function public.get_my_arcana_membership()
from public, anon;

grant execute on function public.has_active_arcana(uuid)
to authenticated;

grant execute on function public.get_my_arcana_membership()
to authenticated;

comment on table public.arcana_billing_payments is
  'Cobranças recorrentes da Arcana conciliadas com o Asaas. Sem leitura direta pelo cliente.';

comment on table public.arcana_billing_events is
  'Auditoria idempotente dos Webhooks Asaas, sem armazenar dados de cartão ou payload completo.';

comment on column public.arcana_subscriptions.provider_checkout_id is
  'ID do Checkout Asaas usado antes da criação da assinatura recorrente.';

comment on column public.arcana_subscriptions.canceled_at is
  'Data em que a renovação foi encerrada; o período já pago pode continuar ativo.';
