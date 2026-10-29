-- Make the intended deny-by-default access explicit for internal ledgers.
-- Service-role Edge Functions retain access through the service_role role; client roles get no rows.
do $migration$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='deny_client_access_to_audit_logs') then
    create policy deny_client_access_to_audit_logs on public.audit_logs for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payment_events' and policyname='deny_client_access_to_payment_events') then
    create policy deny_client_access_to_payment_events on public.payment_events for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='security_events' and policyname='deny_client_access_to_security_events') then
    create policy deny_client_access_to_security_events on public.security_events for all to anon, authenticated using (false) with check (false);
  end if;
end
$migration$;

notify pgrst, 'reload schema';
