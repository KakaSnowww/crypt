set lock_timeout = '5s';
set statement_timeout = '90s';

alter table public.arcana_subscriptions
drop constraint if exists arcana_subscriptions_provider_check;

alter table public.arcana_subscriptions
add constraint arcana_subscriptions_provider_check
check (
  provider in (
    'manual',
    'mercado_pago',
    'stripe',
    'asaas',
    'asaas_pix'
  )
);

create table if not exists public.arcana_pix_authorizations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  provider_customer_id text not null,
  provider_authorization_id text not null unique,
  provider_subscription_id text,
  status text not null default 'created',
  pix_payload text,
  pix_expires_at timestamptz,
  conciliation_identifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arcana_pix_authorizations_customer_check
    check (char_length(provider_customer_id) between 1 and 200),
  constraint arcana_pix_authorizations_authorization_check
    check (char_length(provider_authorization_id) between 1 and 200),
  constraint arcana_pix_authorizations_status_check
    check (status in ('created', 'active', 'cancelled', 'expired', 'refused'))
);

create index if not exists arcana_pix_authorizations_status_idx
on public.arcana_pix_authorizations(status, updated_at desc);

create table if not exists public.arcana_pix_payments (
  provider_payment_id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider_authorization_id text not null,
  status text not null,
  amount numeric(10, 2),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arcana_pix_payments_authorization_check
    check (char_length(provider_authorization_id) between 1 and 200),
  constraint arcana_pix_payments_status_check
    check (char_length(status) between 1 and 80)
);

create index if not exists arcana_pix_payments_profile_idx
on public.arcana_pix_payments(profile_id, confirmed_at desc, created_at desc);

create table if not exists public.arcana_pix_events (
  provider_event_id text primary key,
  event_type text not null,
  resource_id text not null,
  processing_status text not null default 'received',
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint arcana_pix_events_processing_check
    check (processing_status in ('received', 'processed', 'failed'))
);

create index if not exists arcana_pix_events_received_idx
on public.arcana_pix_events(received_at desc);

alter table public.arcana_pix_authorizations enable row level security;
alter table public.arcana_pix_authorizations force row level security;
alter table public.arcana_pix_payments enable row level security;
alter table public.arcana_pix_payments force row level security;
alter table public.arcana_pix_events enable row level security;
alter table public.arcana_pix_events force row level security;

revoke all on table public.arcana_pix_authorizations
from public, anon, authenticated;

revoke all on table public.arcana_pix_payments
from public, anon, authenticated;

revoke all on table public.arcana_pix_events
from public, anon, authenticated;

comment on table public.arcana_pix_authorizations is
  'Autorizações de Pix Automático da Arcana. Dados cadastrais do pagador não são persistidos no Crypt.';

comment on column public.arcana_pix_authorizations.pix_payload is
  'Código Pix Copia e Cola temporário do primeiro pagamento e da autorização recorrente.';
