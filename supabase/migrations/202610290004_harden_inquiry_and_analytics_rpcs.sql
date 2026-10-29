-- Harden public lead and analytics RPCs: fixed search_path, validate conversation ownership,
-- and apply server-side rate limits without exposing tables to browser roles.

create or replace function private.capture_project_inquiry(
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_project_type text,
  p_budget_range text,
  p_brief text,
  p_conversation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if length(trim(coalesce(p_client_name, ''))) < 2 or length(p_client_name) > 120 then
    raise exception using errcode = '22023', message = 'invalid project request';
  end if;
  if length(trim(coalesce(p_client_email, ''))) < 5
     or length(p_client_email) > 254
     or position('@' in p_client_email) = 0 then
    raise exception using errcode = '22023', message = 'invalid project request';
  end if;
  if length(trim(coalesce(p_project_type, ''))) < 2 or length(p_project_type) > 80 then
    raise exception using errcode = '22023', message = 'invalid project request';
  end if;
  if length(trim(coalesce(p_brief, ''))) < 10 or length(p_brief) > 8000 then
    raise exception using errcode = '22023', message = 'invalid project request';
  end if;
  if pg_column_size(coalesce(p_brief, '')) > 16000 then
    raise exception using errcode = '22023', message = 'invalid project request';
  end if;

  if p_conversation_id is not null and not exists (
    select 1
    from public.client_conversations c
    where c.id = p_conversation_id
      and c.client_user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'invalid conversation reference';
  end if;

  if not public.apex_consume_rate_limit(v_user_id, 'project_inquiry', 60, 5) then
    insert into public.security_events(actor_user_id, event_type, severity, endpoint, request_id, metadata)
    values (v_user_id, 'project_inquiry_rate_limit', 'medium', 'rpc/capture_project_inquiry', extensions.gen_random_uuid()::text, '{}'::jsonb);
    return null;
  end if;

  insert into public.project_inquiries(
    client_name, client_email, client_phone, project_type, budget_range, brief, status, conversation_id
  )
  values (
    trim(p_client_name),
    lower(trim(p_client_email)),
    nullif(left(trim(coalesce(p_client_phone, '')), 80), ''),
    left(trim(p_project_type), 80),
    nullif(left(trim(coalesce(p_budget_range, '')), 80), ''),
    trim(p_brief),
    'new',
    p_conversation_id
  )
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function private.capture_site_event(
  p_event_name text,
  p_project_id text default null,
  p_session_id text default null,
  p_locale text default null,
  p_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_id uuid;
  v_user_id uuid;
  v_metadata jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if p_event_name is null or length(trim(p_event_name)) = 0 or length(p_event_name) > 80 then
    raise exception using errcode = '22023', message = 'invalid event';
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb);
  if jsonb_typeof(v_metadata) <> 'object' or pg_column_size(v_metadata) > 5000 then
    raise exception using errcode = '22023', message = 'invalid event metadata';
  end if;

  if not public.apex_consume_rate_limit(v_user_id, 'site_event_capture', 60, 120) then
    insert into public.security_events(actor_user_id, event_type, severity, endpoint, request_id, metadata)
    values (v_user_id, 'site_event_rate_limit', 'low', 'rpc/capture_site_event', extensions.gen_random_uuid()::text, jsonb_build_object('eventName', left(trim(p_event_name), 80)));
    return null;
  end if;

  insert into public.site_events(event_name, project_id, session_id, locale, path, metadata)
  values (
    trim(p_event_name),
    nullif(left(coalesce(p_project_id, ''), 120), ''),
    nullif(left(coalesce(p_session_id, ''), 120), ''),
    nullif(left(coalesce(p_locale, ''), 10), ''),
    nullif(left(coalesce(p_path, ''), 300), ''),
    v_metadata
  )
  returning id into v_id;

  return v_id;
end;
$function$;

-- Prevent public or browser roles from bypassing the wrappers or reading the underlying event tables.
revoke all on function private.capture_project_inquiry(text,text,text,text,text,text,uuid) from public, anon;
grant execute on function private.capture_project_inquiry(text,text,text,text,text,text,uuid) to authenticated;
revoke all on function private.capture_site_event(text,text,text,text,text,jsonb) from public, anon;
grant execute on function private.capture_site_event(text,text,text,text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';
