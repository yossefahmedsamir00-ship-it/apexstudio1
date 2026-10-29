-- Expose validated RPCs to the public Supabase Data API while keeping tables private.
-- Anonymous Auth users use the authenticated Postgres role; the private functions still require auth.uid().

create or replace function public.capture_project_inquiry(
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_project_type text,
  p_budget_range text,
  p_brief text,
  p_conversation_id uuid default null
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select private.capture_project_inquiry(
    p_client_name,
    p_client_email,
    p_client_phone,
    p_project_type,
    p_budget_range,
    p_brief,
    p_conversation_id
  );
$function$;

revoke all on function public.capture_project_inquiry(text,text,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.capture_project_inquiry(text,text,text,text,text,text,uuid) to authenticated;

create or replace function public.capture_site_event(
  p_event_name text,
  p_project_id text default null,
  p_session_id text default null,
  p_locale text default null,
  p_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select private.capture_site_event(
    p_event_name,
    p_project_id,
    p_session_id,
    p_locale,
    p_path,
    p_metadata
  );
$function$;

revoke all on function public.capture_site_event(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.capture_site_event(text,text,text,text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';
