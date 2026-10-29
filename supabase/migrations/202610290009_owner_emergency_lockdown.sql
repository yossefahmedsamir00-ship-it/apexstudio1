-- Owner-controlled emergency lockdown. It blocks new sensitive actions but does not block webhook reconciliation.
create table if not exists public.apex_runtime_controls (
  id boolean primary key default true check (id is true),
  emergency_lockdown boolean not null default false,
  lockdown_reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint apex_runtime_controls_reason_length
    check (lockdown_reason is null or length(lockdown_reason) between 1 and 240)
);

alter table public.apex_runtime_controls enable row level security;
revoke all on public.apex_runtime_controls from public, anon, authenticated;
grant select, insert, update on public.apex_runtime_controls to service_role;
insert into public.apex_runtime_controls(id,emergency_lockdown)
values (true,false)
on conflict (id) do nothing;

drop policy if exists deny_client_access_to_runtime_controls on public.apex_runtime_controls;
create policy deny_client_access_to_runtime_controls
  on public.apex_runtime_controls for all to anon, authenticated
  using (false) with check (false);

create or replace function public.get_apex_runtime_controls()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_controls public.apex_runtime_controls%rowtype;
begin
  if not exists (
    select 1 from public.apex_owner_settings s
    where s.id is true and s.owner_user_id = (select auth.uid())
  ) then
    raise exception using errcode='42501', message='owner access required';
  end if;

  select * into v_controls from public.apex_runtime_controls where id is true;
  if not found then
    raise exception using errcode='55000', message='runtime controls missing';
  end if;

  return jsonb_build_object(
    'emergency_lockdown',v_controls.emergency_lockdown,
    'lockdown_reason',v_controls.lockdown_reason,
    'updated_at',v_controls.updated_at,
    'updated_by',v_controls.updated_by
  );
end;
$function$;

create or replace function public.set_apex_emergency_lockdown(
  p_enabled boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(p_reason,'')),'');
  v_changed boolean := false;
  v_controls public.apex_runtime_controls%rowtype;
begin
  if v_user_id is null or not exists (
    select 1 from public.apex_owner_settings s
    where s.id is true and s.owner_user_id = v_user_id
  ) then
    raise exception using errcode='42501', message='owner access required';
  end if;
  if p_enabled is null then
    raise exception using errcode='22023', message='lockdown state required';
  end if;
  if p_enabled and (v_reason is null or length(v_reason) < 5 or length(v_reason) > 240) then
    raise exception using errcode='22023', message='a reason of 5 to 240 characters is required';
  end if;

  select * into v_controls from public.apex_runtime_controls where id is true for update;
  if not found then
    raise exception using errcode='55000', message='runtime controls missing';
  end if;

  v_changed := v_controls.emergency_lockdown is distinct from p_enabled
    or (p_enabled and v_controls.lockdown_reason is distinct from v_reason);
  update public.apex_runtime_controls
    set emergency_lockdown=p_enabled,
        lockdown_reason=case when p_enabled then v_reason else null end,
        updated_by=v_user_id,
        updated_at=now()
    where id is true
    returning * into v_controls;

  if v_changed then
    insert into public.audit_logs(actor_user_id,action,target_type,target_id,metadata)
    values (
      v_user_id,
      case when p_enabled then 'emergency_lockdown_activated' else 'emergency_lockdown_deactivated' end,
      'runtime_control',
      'apex',
      jsonb_build_object('reason',case when p_enabled then v_reason else null end)
    );

    insert into public.security_events(actor_user_id,event_type,severity,endpoint,request_id,metadata)
    values (
      v_user_id,
      case when p_enabled then 'emergency_lockdown_activated' else 'emergency_lockdown_deactivated' end,
      case when p_enabled then 'critical' else 'high' end,
      'admin/apex-runtime-controls',
      extensions.gen_random_uuid()::text,
      jsonb_build_object('reason',case when p_enabled then v_reason else null end)
    );
  end if;

  return jsonb_build_object(
    'emergency_lockdown',v_controls.emergency_lockdown,
    'lockdown_reason',v_controls.lockdown_reason,
    'updated_at',v_controls.updated_at,
    'updated_by',v_controls.updated_by
  );
end;
$function$;

revoke all on function public.get_apex_runtime_controls() from public, anon;
grant execute on function public.get_apex_runtime_controls() to authenticated;
revoke all on function public.set_apex_emergency_lockdown(boolean,text) from public, anon;
grant execute on function public.set_apex_emergency_lockdown(boolean,text) to authenticated;

notify pgrst, 'reload schema';
