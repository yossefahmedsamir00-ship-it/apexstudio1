-- APEX STUDIO client inquiry/chat/payment core schema
-- Public visitors cannot directly read or write these tables; use validated server-side functions.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.client_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_conversations (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  visitor_token_hash text,
  client_name text,
  client_email text,
  subject text not null default 'Project inquiry',
  status text not null default 'open' check (status in ('open','waiting_owner','ai_handled','waiting_client','closed','escalated')),
  last_client_message_at timestamptz,
  last_owner_message_at timestamptz,
  ai_fallback_after timestamptz,
  ai_fallback_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_identity_check check (owner_user_id is not null or visitor_token_hash is not null)
);

create table if not exists public.client_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.client_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('client','owner','ai','system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 8000),
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint client_messages_idempotency_unique unique (conversation_id, idempotency_key)
);

create table if not exists public.project_inquiries (
  id uuid primary key default extensions.gen_random_uuid(),
  client_name text not null check (length(trim(client_name)) between 1 and 120),
  client_email text not null check (length(trim(client_email)) between 3 and 254),
  client_phone text,
  project_type text not null check (length(trim(project_type)) between 1 and 100),
  budget_range text,
  brief text not null check (length(trim(brief)) between 10 and 8000),
  status text not null default 'new' check (status in ('new','contacted','in_progress','completed','cancelled')),
  conversation_id uuid references public.client_conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid references public.client_conversations(id) on delete set null,
  inquiry_id uuid references public.project_inquiries(id) on delete set null,
  customer_user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'paymob' check (provider in ('paymob','fawry','manual')),
  provider_transaction_id text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status text not null default 'pending' check (status in ('pending','checkout_created','paid','failed','cancelled','refunded')),
  checkout_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apex_owner_settings (
  id boolean primary key default true check (id),
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_conversations_status_updated_idx on public.client_conversations(status, updated_at desc);
create index if not exists client_conversations_owner_user_idx on public.client_conversations(owner_user_id);
create index if not exists client_messages_conversation_created_idx on public.client_messages(conversation_id, created_at);
create index if not exists client_messages_sender_user_idx on public.client_messages(sender_user_id);
create index if not exists project_inquiries_status_created_idx on public.project_inquiries(status, created_at desc);
create index if not exists project_inquiries_conversation_idx on public.project_inquiries(conversation_id);
create index if not exists payment_orders_status_created_idx on public.payment_orders(status, created_at desc);
create index if not exists payment_orders_conversation_idx on public.payment_orders(conversation_id);
create index if not exists payment_orders_inquiry_idx on public.payment_orders(inquiry_id);
create index if not exists payment_orders_customer_idx on public.payment_orders(customer_user_id);
create index if not exists apex_owner_settings_owner_idx on public.apex_owner_settings(owner_user_id);
create unique index if not exists payment_orders_provider_transaction_unique on public.payment_orders(provider, provider_transaction_id) where provider_transaction_id is not null;

alter table public.client_profiles enable row level security;
alter table public.client_conversations enable row level security;
alter table public.client_messages enable row level security;
alter table public.project_inquiries enable row level security;
alter table public.payment_orders enable row level security;
alter table public.apex_owner_settings enable row level security;

drop policy if exists "profile_select_self" on public.client_profiles;
create policy "profile_select_self" on public.client_profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profile_insert_self" on public.client_profiles;
create policy "profile_insert_self" on public.client_profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profile_update_self" on public.client_profiles;
create policy "profile_update_self" on public.client_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.apex_owner_is_configured()
returns boolean language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.apex_owner_settings s where s.id = true and s.owner_user_id = (select auth.uid()));
$$;
revoke all on function public.apex_owner_is_configured() from public, anon;
grant execute on function public.apex_owner_is_configured() to authenticated;

drop policy if exists "owner_manage_conversations" on public.client_conversations;
create policy "owner_manage_conversations" on public.client_conversations for all to authenticated using (public.apex_owner_is_configured()) with check (public.apex_owner_is_configured());
drop policy if exists "owner_manage_messages" on public.client_messages;
create policy "owner_manage_messages" on public.client_messages for all to authenticated using (public.apex_owner_is_configured()) with check (public.apex_owner_is_configured());
drop policy if exists "owner_manage_inquiries" on public.project_inquiries;
create policy "owner_manage_inquiries" on public.project_inquiries for all to authenticated using (public.apex_owner_is_configured()) with check (public.apex_owner_is_configured());
drop policy if exists "owner_manage_payment_orders" on public.payment_orders;
create policy "owner_manage_payment_orders" on public.payment_orders for all to authenticated using (public.apex_owner_is_configured()) with check (public.apex_owner_is_configured());

revoke all on public.client_profiles from anon, authenticated;
grant select, insert, update on public.client_profiles to authenticated;
revoke all on public.client_conversations from anon, authenticated;
revoke all on public.client_messages from anon, authenticated;
revoke all on public.project_inquiries from anon, authenticated;
revoke all on public.payment_orders from anon, authenticated;
revoke all on public.apex_owner_settings from anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to postgres;
