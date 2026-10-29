-- Secure hosted checkout support for Kashier (EGP)
alter table public.payment_orders
  drop constraint if exists payment_orders_provider_check;

alter table public.payment_orders
  add constraint payment_orders_provider_check
  check (provider = any (array['kashier'::text, 'paymob'::text, 'fawry'::text, 'manual'::text]));

alter table public.payment_orders
  add column if not exists description text not null default 'APEX STUDIO service invoice',
  add column if not exists checkout_token_hash text,
  add column if not exists checkout_token_expires_at timestamptz,
  add column if not exists provider_reference text,
  add column if not exists provider_session_id text,
  add column if not exists session_expires_at timestamptz,
  add column if not exists checkout_attempt_count integer not null default 0;

alter table public.payment_orders
  drop constraint if exists payment_orders_description_check;
alter table public.payment_orders
  add constraint payment_orders_description_check
  check (length(trim(description)) between 1 and 300) not valid;
alter table public.payment_orders
  validate constraint payment_orders_description_check;

alter table public.payment_orders
  drop constraint if exists payment_orders_checkout_attempt_count_check;
alter table public.payment_orders
  add constraint payment_orders_checkout_attempt_count_check
  check (checkout_attempt_count between 0 and 20) not valid;
alter table public.payment_orders
  validate constraint payment_orders_checkout_attempt_count_check;

create unique index if not exists payment_orders_checkout_token_hash_unique
  on public.payment_orders(checkout_token_hash)
  where checkout_token_hash is not null;

create unique index if not exists payment_orders_provider_reference_unique
  on public.payment_orders(provider, provider_reference)
  where provider_reference is not null;

create unique index if not exists payment_orders_provider_session_unique
  on public.payment_orders(provider, provider_session_id)
  where provider_session_id is not null;

create index if not exists payment_orders_checkout_expiry_idx
  on public.payment_orders(checkout_token_expires_at)
  where status in ('pending', 'checkout_created');

comment on column public.payment_orders.checkout_token_hash is
  'SHA-256 hash of an unguessable customer checkout token; the raw token is only shared once with the invoice owner.';
comment on column public.payment_orders.provider_session_id is
  'Hosted checkout session identifier returned by the payment provider.';
comment on column public.payment_orders.provider_reference is
  'Unique merchant order reference sent to the payment provider; used to reconcile authenticated webhooks.';
