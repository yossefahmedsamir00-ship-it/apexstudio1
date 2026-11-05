-- APEX STUDIO owner-managed public content.
-- The owner helper reads a table that is intentionally not directly granted to clients.
-- SECURITY DEFINER is required so existing and new owner-only RLS policies can evaluate it.
create or replace function public.apex_owner_is_configured()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.apex_owner_settings s
    where s.id = true and s.owner_user_id = (select auth.uid())
  );
$$;
revoke all on function public.apex_owner_is_configured() from public, anon;
grant execute on function public.apex_owner_is_configured() to authenticated;

-- Apply only after review; this file is not deployed automatically.
create table if not exists public.apex_site_content (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 100),
  title text not null check (length(trim(title)) between 1 and 160),
  content_type text not null check (content_type in ('page_section','project','service','announcement')),
  summary text not null default '' check (length(summary) <= 2000),
  body jsonb not null default '{}'::jsonb check (jsonb_typeof(body) = 'object'),
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists apex_site_content_public_order_idx on public.apex_site_content(status, sort_order, updated_at desc);
alter table public.apex_site_content enable row level security;
drop policy if exists "public_read_published_apex_content" on public.apex_site_content;
drop policy if exists "authenticated_read_apex_content" on public.apex_site_content;
create policy "public_read_published_apex_content" on public.apex_site_content for select to anon
  using (status = 'published');
create policy "authenticated_read_apex_content" on public.apex_site_content for select to authenticated
  using (status = 'published' or public.apex_owner_is_configured());
drop policy if exists "owner_manage_apex_content" on public.apex_site_content;
create policy "owner_manage_apex_content" on public.apex_site_content for all to authenticated
  using (public.apex_owner_is_configured()) with check (public.apex_owner_is_configured());
revoke all on public.apex_site_content from public, anon, authenticated;
grant select on public.apex_site_content to anon, authenticated;
grant insert, update, delete on public.apex_site_content to authenticated;
create or replace function public.apex_site_content_touch_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.status = 'published' and old.status is distinct from 'published' then new.published_at := now();
  elsif new.status = 'draft' then new.published_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists apex_site_content_touch_updated_at on public.apex_site_content;
create trigger apex_site_content_touch_updated_at before update on public.apex_site_content
for each row execute function public.apex_site_content_touch_updated_at();
comment on table public.apex_site_content is 'APEX STUDIO CMS. Anonymous visitors can read published rows only; owner access is gated by apex_owner_is_configured().';
