-- Run after the APEX SOCIAL AI migrations against a disposable/staging database.
-- Read-only catalog assertions; does not create or mutate application data.
do $$
declare
  t text;
  expected_tables text[] := array[
    'social_tenants','social_memberships','social_accounts','social_campaigns',
    'social_content_items','social_content_versions','social_media_assets',
    'social_approvals','social_publish_jobs','social_publish_attempts',
    'social_analytics_snapshots','social_workflow_runs','social_audit_events'
  ];
  required_constraints text[] := array[
    'social_content_campaign_same_tenant_fk',
    'social_content_versions_item_same_tenant_fk',
    'social_media_assets_item_same_tenant_fk',
    'social_approvals_item_same_tenant_fk',
    'social_publish_item_same_tenant_fk',
    'social_publish_account_same_tenant_fk',
    'social_publish_approval_same_tenant_fk',
    'social_attempt_job_same_tenant_fk',
    'social_analytics_account_same_tenant_fk',
    'social_analytics_item_same_tenant_fk',
    'social_content_versions_tenant_item_id_unique',
    'social_approvals_version_same_item_fk',
    'social_approvals_tenant_item_version_id_unique',
    'social_publish_approval_same_item_version_fk'
  ];
  constraint_name text;
begin
  foreach t in array expected_tables loop
    if to_regclass(format('public.%I',t)) is null then
      raise exception 'Missing social table: %',t;
    end if;
    if not coalesce((select c.relrowsecurity from pg_class c where c.oid=to_regclass(format('public.%I',t))),false) then
      raise exception 'RLS is not enabled on public.%',t;
    end if;
    if not coalesce((select c.relforcerowsecurity from pg_class c where c.oid=to_regclass(format('public.%I',t))),false) then
      raise exception 'FORCE RLS is not enabled on public.%',t;
    end if;
    if has_table_privilege('anon',format('public.%I',t),'SELECT')
       or has_table_privilege('authenticated',format('public.%I',t),'SELECT') then
      raise exception 'Client role unexpectedly has SELECT on public.%',t;
    end if;
  end loop;

  if to_regclass('private.social_account_secrets') is null then
    raise exception 'Missing private.social_account_secrets';
  end if;
  if has_table_privilege('anon','private.social_account_secrets','SELECT')
     or has_table_privilege('authenticated','private.social_account_secrets','SELECT') then
    raise exception 'Client role can read provider credentials';
  end if;
  if not has_table_privilege('service_role','private.social_account_secrets','SELECT') then
    raise exception 'service_role cannot read private provider credentials';
  end if;

  foreach constraint_name in array required_constraints loop
    if not exists (select 1 from pg_constraint where conname=constraint_name) then
      raise exception 'Missing tenant-integrity constraint: %',constraint_name;
    end if;
  end loop;

  if not exists (select 1 from public.social_tenants where slug='apex-studio') then
    raise exception 'APEX STUDIO tenant seed is missing';
  end if;
end
$$;
