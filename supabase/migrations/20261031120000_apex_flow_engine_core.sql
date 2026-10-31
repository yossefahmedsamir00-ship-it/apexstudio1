-- APEX FLOW ENGINE core persistence.
-- All reads and writes are routed through authenticated Edge Functions.
-- Direct anon/authenticated table access is intentionally denied.

begin;

create table public.flow_requests (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 8000),
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  status text not null default 'draft' check (status in ('draft', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_requests_id_owner_unique unique (id, owner_user_id)
);

create table public.flow_operations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 4000),
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'running', 'waiting_approval', 'succeeded', 'failed', 'cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  error_code text,
  error_message text,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_operations_id_owner_unique unique (id, owner_user_id),
  constraint flow_operations_request_owner_fk
    foreign key (request_id, owner_user_id)
    references public.flow_requests (id, owner_user_id) on delete cascade
);

create table public.flow_operation_steps (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed', 'skipped')),
  step_order integer not null check (step_order >= 0),
  depends_on uuid[] not null default '{}',
  result_summary text,
  error_code text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_operation_steps_order_unique unique (operation_id, step_order),
  constraint flow_operation_steps_id_owner_unique unique (id, owner_user_id),
  constraint flow_operation_steps_operation_owner_fk
    foreign key (operation_id, owner_user_id)
    references public.flow_operations (id, owner_user_id) on delete cascade
);

create table public.flow_video_projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  brief text not null default '' check (char_length(brief) <= 8000),
  status text not null default 'planned'
    check (status in ('planned', 'drafting', 'in_review', 'approved', 'completed', 'failed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_video_projects_id_owner_unique unique (id, owner_user_id),
  constraint flow_video_projects_operation_owner_fk
    foreign key (operation_id, owner_user_id)
    references public.flow_operations (id, owner_user_id) on delete restrict
);

create table public.flow_scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  brief text not null default '' check (char_length(brief) <= 4000),
  script text not null default '' check (char_length(script) <= 12000),
  visual_direction text not null default '' check (char_length(visual_direction) <= 4000),
  status text not null default 'planned'
    check (status in ('planned', 'drafting', 'ready_for_review', 'approved', 'generating', 'completed', 'failed')),
  revision integer not null default 1 check (revision >= 1),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_scenes_project_order_unique unique (project_id, sort_order),
  constraint flow_scenes_id_owner_unique unique (id, owner_user_id),
  constraint flow_scenes_project_owner_fk
    foreign key (project_id, owner_user_id)
    references public.flow_video_projects (id, owner_user_id) on delete cascade
);

create table public.flow_assets (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null check (char_length(btrim(storage_bucket)) between 1 and 100),
  storage_path text not null check (char_length(btrim(storage_path)) between 1 and 1000),
  media_type text not null check (media_type in ('image', 'video', 'audio', 'document', 'other')),
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 16384),
  created_at timestamptz not null default now(),
  constraint flow_assets_scene_path_unique unique (scene_id, storage_bucket, storage_path),
  constraint flow_assets_scene_owner_fk
    foreign key (scene_id, owner_user_id)
    references public.flow_scenes (id, owner_user_id) on delete cascade
);

create table public.flow_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  action text not null check (action in ('publish', 'send', 'execute', 'approve_scene')),
  target_type text not null check (target_type in ('scene', 'publishing_draft', 'operation')),
  target_id uuid not null,
  target text not null check (char_length(btrim(target)) between 1 and 300),
  content_revision integer not null check (content_revision >= 1),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  decision text not null default 'pending' check (decision in ('pending', 'approved', 'rejected', 'revoked')),
  decision_comment text check (decision_comment is null or char_length(decision_comment) <= 1000),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flow_approvals_operation_owner_fk
    foreign key (operation_id, owner_user_id)
    references public.flow_operations (id, owner_user_id) on delete cascade
);

create table public.flow_publishing_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  platform text not null check (platform in ('instagram', 'facebook', 'x', 'tiktok', 'youtube', 'other')),
  title text not null default '' check (char_length(title) <= 300),
  body text not null check (char_length(btrim(body)) between 1 and 12000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  revision integer not null default 1 check (revision >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'awaiting_approval', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'not_configured')),
  scheduled_at timestamptz,
  published_at timestamptz,
  provider_post_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_publishing_drafts_id_owner_unique unique (id, owner_user_id),
  constraint flow_publishing_drafts_operation_owner_fk
    foreign key (operation_id, owner_user_id)
    references public.flow_operations (id, owner_user_id) on delete cascade
);

create table public.flow_financial_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid,
  entry_type text not null check (entry_type in ('income', 'expense', 'refund')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  source text not null check (source in ('manual', 'kashier', 'provider_import', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'refunded', 'estimated', 'voided')),
  evidence_reference text check (evidence_reference is null or char_length(evidence_reference) <= 1000),
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flow_financial_entries_operation_owner_fk
    foreign key (operation_id, owner_user_id)
    references public.flow_operations (id, owner_user_id) on delete set null (operation_id)
);

create table public.flow_audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 100),
  target_type text not null check (char_length(btrim(target_type)) between 1 and 80),
  target_id uuid,
  correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 16384),
  created_at timestamptz not null default now()
);

create index flow_requests_owner_created_idx on public.flow_requests (owner_user_id, created_at desc);
create index flow_requests_owner_status_idx on public.flow_requests (owner_user_id, status);
create index flow_operations_owner_created_idx on public.flow_operations (owner_user_id, created_at desc);
create index flow_operations_owner_status_idx on public.flow_operations (owner_user_id, status);
create index flow_operation_steps_operation_order_idx on public.flow_operation_steps (operation_id, step_order);
create index flow_video_projects_owner_updated_idx on public.flow_video_projects (owner_user_id, updated_at desc);
create index flow_scenes_project_order_idx on public.flow_scenes (project_id, sort_order);
create index flow_assets_scene_created_idx on public.flow_assets (scene_id, created_at desc);
create index flow_approvals_owner_decision_idx on public.flow_approvals (owner_user_id, decision, created_at desc);
create index flow_publishing_drafts_owner_status_idx on public.flow_publishing_drafts (owner_user_id, status, updated_at desc);
create index flow_financial_entries_owner_occurred_idx on public.flow_financial_entries (owner_user_id, occurred_at desc nulls last);
create index flow_financial_entries_owner_status_idx on public.flow_financial_entries (owner_user_id, status, currency);
create index flow_audit_events_owner_created_idx on public.flow_audit_events (owner_user_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'flow_requests',
    'flow_operations',
    'flow_operation_steps',
    'flow_video_projects',
    'flow_scenes',
    'flow_assets',
    'flow_approvals',
    'flow_publishing_drafts',
    'flow_financial_entries',
    'flow_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      table_name || '_server_only',
      table_name
    );
  end loop;
end
$$;

comment on table public.flow_requests is 'Private APEX FLOW owner requests; accessed only through authenticated server functions.';
comment on table public.flow_financial_entries is 'Owner-entered or provider-reconciled financial records; never synthetic revenue.';
comment on table public.flow_approvals is 'Approval snapshots bound to exact content hash, revision, action, and destination.';

commit;
