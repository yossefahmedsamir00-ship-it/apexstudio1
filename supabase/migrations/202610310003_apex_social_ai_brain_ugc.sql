-- APEX SOCIAL AI: source-traceable Brand Brain and UGC persistence.
create table if not exists public.social_brand_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  title text not null,
  document_type text not null default 'brand_note',
  source_url text,
  summary text,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_ugc_briefs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.social_tenants(id) on delete cascade,
  title text not null,
  brief text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_brand_documents_tenant_updated_idx on public.social_brand_documents(tenant_id,updated_at desc);
create index if not exists social_ugc_briefs_tenant_created_idx on public.social_ugc_briefs(tenant_id,created_at desc);

alter table public.social_brand_documents enable row level security;
alter table public.social_brand_documents force row level security;
revoke all on public.social_brand_documents from public, anon, authenticated;
grant all on public.social_brand_documents to service_role;
drop policy if exists social_brand_documents_server_only on public.social_brand_documents;
create policy social_brand_documents_server_only on public.social_brand_documents for all to anon, authenticated using (false) with check (false);

alter table public.social_ugc_briefs enable row level security;
alter table public.social_ugc_briefs force row level security;
revoke all on public.social_ugc_briefs from public, anon, authenticated;
grant all on public.social_ugc_briefs to service_role;
drop policy if exists social_ugc_briefs_server_only on public.social_ugc_briefs;
create policy social_ugc_briefs_server_only on public.social_ugc_briefs for all to anon, authenticated using (false) with check (false);

comment on table public.social_brand_documents is 'Owner-curated source material for Brand Brain; each answer can return the exact source documents used.';
comment on table public.social_ugc_briefs is 'Generated UGC production briefs stored for review and reuse.';
