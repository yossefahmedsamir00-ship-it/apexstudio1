-- When a visitor turns a persistent chat into a project brief, attach the supplied contact details
-- to that same conversation only after the existing ownership check succeeds.
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

  if p_conversation_id is not null then
    update public.client_conversations
    set client_name = trim(p_client_name),
        client_email = lower(trim(p_client_email)),
        updated_at = now()
    where id = p_conversation_id
      and client_user_id = v_user_id;
  end if;

  return v_id;
end;
$function$;

notify pgrst, 'reload schema';
