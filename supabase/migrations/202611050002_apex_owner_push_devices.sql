-- Per-device FCM registrations for the configured APEX owner only.
create table if not exists public.apex_owner_push_devices (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  fcm_token text not null unique check (length(fcm_token) between 20 and 4096),
  platform text not null check (platform in ('android','ios','web','other')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists apex_owner_push_devices_owner_idx
  on public.apex_owner_push_devices(owner_user_id);
alter table public.apex_owner_push_devices enable row level security;
drop policy if exists "owner_read_own_push_devices" on public.apex_owner_push_devices;
create policy "owner_read_own_push_devices" on public.apex_owner_push_devices
  for select to authenticated
  using (public.apex_owner_is_configured() and owner_user_id = (select auth.uid()));
drop policy if exists "owner_register_own_push_devices" on public.apex_owner_push_devices;
create policy "owner_register_own_push_devices" on public.apex_owner_push_devices
  for insert to authenticated
  with check (public.apex_owner_is_configured() and owner_user_id = (select auth.uid()));
drop policy if exists "owner_update_own_push_devices" on public.apex_owner_push_devices;
create policy "owner_update_own_push_devices" on public.apex_owner_push_devices
  for update to authenticated
  using (public.apex_owner_is_configured() and owner_user_id = (select auth.uid()))
  with check (public.apex_owner_is_configured() and owner_user_id = (select auth.uid()));
drop policy if exists "owner_delete_own_push_devices" on public.apex_owner_push_devices;
create policy "owner_delete_own_push_devices" on public.apex_owner_push_devices
  for delete to authenticated
  using (public.apex_owner_is_configured() and owner_user_id = (select auth.uid()));
revoke all on public.apex_owner_push_devices from public, anon, authenticated;
grant select, insert, update, delete on public.apex_owner_push_devices to authenticated;
comment on table public.apex_owner_push_devices is
  'FCM device tokens for the configured APEX owner. Client access is limited to the current owner account.';
