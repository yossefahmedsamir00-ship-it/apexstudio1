-- Run on a disposable or staging database after applying the APEX FLOW ENGINE migration.
-- This script is read-only and validates the private server-only table boundary.
do $$
declare
  t text;
  expected_tables text[] := array[
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
  ];
begin
  foreach t in array expected_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise exception 'Missing Flow Engine table: %', t;
    end if;

    if not coalesce((
      select c.relrowsecurity
      from pg_class c
      where c.oid = to_regclass(format('public.%I', t))
    ), false) then
      raise exception 'RLS is not enabled on public.%', t;
    end if;

    if not coalesce((
      select c.relforcerowsecurity
      from pg_class c
      where c.oid = to_regclass(format('public.%I', t))
    ), false) then
      raise exception 'FORCE RLS is not enabled on public.%', t;
    end if;

    if has_table_privilege('anon', format('public.%I', t), 'SELECT')
       or has_table_privilege('authenticated', format('public.%I', t), 'SELECT')
       or has_table_privilege('anon', format('public.%I', t), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', t), 'INSERT')
       or has_table_privilege('anon', format('public.%I', t), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', t), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', t), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I', t), 'DELETE') then
      raise exception 'A client role unexpectedly has a write/read grant on public.%', t;
    end if;

    if not exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = t
        and p.policyname = t || '_server_only'
        and p.cmd = 'ALL'
        and p.qual = 'false'
        and p.with_check = 'false'
    ) then
      raise exception 'Missing server-only deny policy on public.%', t;
    end if;

    if not has_table_privilege('service_role', format('public.%I', t), 'SELECT')
       or not has_table_privilege('service_role', format('public.%I', t), 'INSERT')
       or not has_table_privilege('service_role', format('public.%I', t), 'UPDATE')
       or not has_table_privilege('service_role', format('public.%I', t), 'DELETE') then
      raise exception 'service_role is missing required privileges on public.%', t;
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint where conname = 'flow_operations_request_owner_fk'
  ) or not exists (
    select 1 from pg_constraint where conname = 'flow_operation_steps_operation_owner_fk'
  ) or not exists (
    select 1 from pg_constraint where conname = 'flow_scenes_project_owner_fk'
  ) or not exists (
    select 1 from pg_constraint where conname = 'flow_approvals_operation_owner_fk'
  ) then
    raise exception 'One or more owner-consistent foreign keys are missing';
  end if;
end
$$;
