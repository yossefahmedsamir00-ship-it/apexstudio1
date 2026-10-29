-- APEX reliability/security phase: durable conversations, read receipts, audit/security events and atomic rate limiting.

alter table public.client_conversations
  add column if not exists client_user_id uuid references auth.users(id) on delete set null;

create index if not exists client_conversations_client_updated_idx
  on public.client_conversations(client_user_id, updated_at desc);

alter table public.client_messages
  add column if not exists read_at timestamptz,
  add column if not exists message_status text not null default 'sent',
  add column if not exists attachment_metadata jsonb not null default '[]'::jsonb;

alter table public.client_messages
  drop constraint if exists client_messages_message_status_check;
alter table public.client_messages
  add constraint client_messages_message_status_check
  check (message_status = any (array['sent'::text,'delivered'::text,'read'::text,'failed'::text])) not valid;
alter table public.client_messages
  validate constraint client_messages_message_status_check;

alter table public.client_messages
  drop constraint if exists client_messages_attachment_metadata_check;
alter table public.client_messages
  add constraint client_messages_attachment_metadata_check
  check (jsonb_typeof(attachment_metadata) = 'array' and jsonb_array_length(attachment_metadata) <= 5) not valid;
alter table public.client_messages
  validate constraint client_messages_attachment_metadata_check;

create index if not exists client_messages_conversation_unread_idx
  on public.client_messages(conversation_id, sender_type, read_at, created_at desc);

create table if not exists public.security_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (length(trim(event_type)) between 1 and 100),
  severity text not null default 'info' check (severity = any (array['info'::text,'low'::text,'medium'::text,'high'::text,'critical'::text])),
  endpoint text,
  request_id text,
  origin text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.security_events enable row level security;
revoke all on public.security_events from public, anon, authenticated;
grant select, insert on public.security_events to service_role;
create index if not exists security_events_created_idx on public.security_events(created_at desc);
create index if not exists security_events_severity_created_idx on public.security_events(severity, created_at desc);
create index if not exists security_events_actor_created_idx on public.security_events(actor_user_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(trim(action)) between 1 and 100),
  target_type text not null check (length(trim(target_type)) between 1 and 80),
  target_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public, anon, authenticated;
grant select, insert on public.audit_logs to service_role;
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs(target_type, target_id, created_at desc);

create table if not exists private.apex_rate_limit_buckets (
  subject_id uuid not null,
  bucket text not null check (length(trim(bucket)) between 1 and 80),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (subject_id, bucket, window_start)
);
revoke all on private.apex_rate_limit_buckets from public, anon, authenticated;
grant all on private.apex_rate_limit_buckets to service_role;

create or replace function public.apex_consume_rate_limit(
  p_subject_id uuid,
  p_bucket text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, private
as $function$
declare
  v_start timestamptz;
  v_count integer;
begin
  if p_subject_id is null
     or p_bucket is null
     or length(trim(p_bucket)) < 1
     or length(p_bucket) > 80
     or p_window_seconds is null
     or p_window_seconds < 1
     or p_window_seconds > 3600
     or p_limit is null
     or p_limit < 1
     or p_limit > 1000 then
    return false;
  end if;

  v_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.apex_rate_limit_buckets(subject_id, bucket, window_start, request_count)
  values (p_subject_id, trim(p_bucket), v_start, 1)
  on conflict (subject_id, bucket, window_start)
  do update set request_count = private.apex_rate_limit_buckets.request_count + 1
  returning request_count into v_count;

  delete from private.apex_rate_limit_buckets
  where subject_id = p_subject_id
    and window_start < clock_timestamp() - interval '2 days';

  return v_count <= p_limit;
end;
$function$;

revoke all on function public.apex_consume_rate_limit(uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.apex_consume_rate_limit(uuid,text,integer,integer) to service_role;

-- The owner dashboard queries analytics directly. Expose read-only access to configured owner only.
drop policy if exists owner_read_site_events on public.site_events;
create policy owner_read_site_events on public.site_events
  for select to authenticated
  using (private.apex_owner_is_configured());

grant select on public.site_events to authenticated;

notify pgrst, 'reload schema';
