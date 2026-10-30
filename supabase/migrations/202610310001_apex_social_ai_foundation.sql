-- APEX SOCIAL AI: tenant-aware content, approval, publishing, and analytics foundation.
-- Provider credentials remain server-only in the private schema.
-- No client roles receive table privileges; access is mediated by authenticated Edge Functions.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists public.social_tenants (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','analyst')),
  created_at timestamptz not null default now(),
  unique (tenant_id,user_id)
);

create table if not exists public.social_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','tiktok','youtube')),
  provider_account_id text not null,
  account_name text not null,
  account_type text,
  connection_status text not null default 'not_configured'
    check (connection_status in ('not_configured','pending_oauth','connected','reauthorization_required','disconnected','error')),
  granted_scopes text[] not null default '{}',
  token_expires_at timestamptz,
  last_verified_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,platform,provider_account_id)
);

create table if not exists private.social_account_secrets (
  social_account_id uuid primary key references public.social_accounts(id) on delete cascade,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  encryption_key_version text not null,
  token_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_campaigns (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  name text not null,
  objective text,
  brief text,
  status text not null default 'draft' check (status in ('draft','active','paused','completed','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.social_content_items (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  campaign_id uuid references public.social_campaigns(id) on delete set null,
  title text not null,
  content_type text not null check (content_type in ('post','reel','story','short','video','community_post')),
  status text not null default 'idea'
    check (status in ('idea','draft','in_review','approved','scheduled','publishing','published','rejected','failed','cancelled')),
  timezone text not null default 'UTC',
  scheduled_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_content_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  content_item_id uuid not null references public.social_content_items(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  body text not null,
  platform_variants jsonb not null default '{}'::jsonb check (jsonb_typeof(platform_variants) = 'object'),
  ai_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(ai_metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (content_item_id,version_number),
  unique (tenant_id,id)
);

create table if not exists public.social_media_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  content_item_id uuid references public.social_content_items(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image','video','thumbnail','document')),
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(12,3) check (duration_seconds is null or duration_seconds >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (tenant_id,storage_bucket,storage_path)
);

create table if not exists public.social_approvals (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  content_item_id uuid not null references public.social_content_items(id) on delete cascade,
  content_version_id uuid not null,
  decision text not null check (decision in ('approved','rejected')),
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  comment text,
  approved_platforms text[] not null default '{}',
  foreign key (tenant_id,content_version_id)
    references public.social_content_versions(tenant_id,id) on delete restrict
);

create table if not exists public.social_publish_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  content_item_id uuid not null references public.social_content_items(id) on delete cascade,
  content_version_id uuid not null,
  social_account_id uuid not null references public.social_accounts(id) on delete restrict,
  approval_id uuid not null references public.social_approvals(id) on delete restrict,
  status text not null default 'scheduled'
    check (status in ('scheduled','queued','publishing','published','failed','cancelled')),
  scheduled_at timestamptz not null,
  idempotency_key text not null unique,
  provider_post_id text,
  provider_permalink text,
  published_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id,content_version_id)
    references public.social_content_versions(tenant_id,id) on delete restrict
);

create table if not exists public.social_publish_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  publish_job_id uuid not null references public.social_publish_jobs(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  outcome text not null check (outcome in ('started','succeeded','retryable_error','permanent_error')),
  provider_request_id text,
  provider_response_code integer,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (publish_job_id,attempt_number)
);

create table if not exists public.social_analytics_snapshots (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  content_item_id uuid references public.social_content_items(id) on delete set null,
  platform text not null check (platform in ('instagram','facebook','tiktok','youtube')),
  metric_key text not null,
  metric_value numeric(24,6) not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  fetched_at timestamptz not null default now(),
  source_api_version text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (period_end >= period_start)
);

create table if not exists public.social_workflow_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  workflow_key text not null,
  external_run_id text,
  status text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  trigger_source text not null,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.social_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid references public.social_tenants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists social_memberships_user_idx on public.social_memberships(user_id,tenant_id);
create index if not exists social_accounts_tenant_platform_idx on public.social_accounts(tenant_id,platform,connection_status);
create index if not exists social_campaigns_tenant_status_idx on public.social_campaigns(tenant_id,status,created_at desc);
create index if not exists social_content_tenant_status_schedule_idx on public.social_content_items(tenant_id,status,scheduled_at);
create index if not exists social_versions_item_created_idx on public.social_content_versions(content_item_id,created_at desc);
create index if not exists social_assets_item_idx on public.social_media_assets(tenant_id,content_item_id);
create index if not exists social_approvals_item_decided_idx on public.social_approvals(content_item_id,decided_at desc);
create index if not exists social_publish_due_idx on public.social_publish_jobs(status,scheduled_at) where status in ('scheduled','queued');
create index if not exists social_publish_tenant_idx on public.social_publish_jobs(tenant_id,created_at desc);
create index if not exists social_attempts_job_idx on public.social_publish_attempts(publish_job_id,attempt_number desc);
create index if not exists social_analytics_account_period_idx on public.social_analytics_snapshots(social_account_id,metric_key,period_end desc);
create index if not exists social_analytics_tenant_fetched_idx on public.social_analytics_snapshots(tenant_id,fetched_at desc);
create index if not exists social_workflow_tenant_created_idx on public.social_workflow_runs(tenant_id,created_at desc);
create index if not exists social_audit_tenant_created_idx on public.social_audit_events(tenant_id,created_at desc);

-- All social tables are server-mediated. RLS is defense in depth; no anon/authenticated
-- grants are made. service_role is used only by Edge Functions and trusted workers.
do $$
declare
  t text;
begin
  foreach t in array array[
    'social_tenants','social_memberships','social_accounts','social_campaigns',
    'social_content_items','social_content_versions','social_media_assets',
    'social_approvals','social_publish_jobs','social_publish_attempts',
    'social_analytics_snapshots','social_workflow_runs','social_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('drop policy if exists social_server_only on public.%I',t);
    execute format('create policy social_server_only on public.%I for all to anon, authenticated using (false) with check (false)',t);
  end loop;
end
$$;

alter table private.social_account_secrets enable row level security;
alter table private.social_account_secrets force row level security;
revoke all on private.social_account_secrets from public, anon, authenticated;
grant all on private.social_account_secrets to service_role;
drop policy if exists social_secrets_server_only on private.social_account_secrets;
create policy social_secrets_server_only on private.social_account_secrets
  for all to anon, authenticated using (false) with check (false);

insert into public.social_tenants(slug,display_name)
values ('apex-studio','APEX STUDIO')
on conflict (slug) do nothing;

comment on table public.social_accounts is 'Provider account metadata only. OAuth credentials are stored in private.social_account_secrets.';
comment on table private.social_account_secrets is 'Encrypted provider credentials. Encryption/decryption must occur in trusted Edge Functions using externally managed keys.';
comment on table public.social_approvals is 'Immutable approval decisions tied to an exact content version; content edits require a new version and approval.';
comment on table public.social_publish_jobs is 'Publishing is gated by an explicit approval record and a unique idempotency key.';
