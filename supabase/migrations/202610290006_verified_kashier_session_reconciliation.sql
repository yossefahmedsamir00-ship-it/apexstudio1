-- Durable server-side reconciliation for Kashier session polling.
-- A provider session read is authoritative but is not an HMAC-signed webhook, so record its method explicitly.
alter table public.payment_events
  add column if not exists verification_method text not null default 'webhook_hmac';

alter table public.payment_events
  drop constraint if exists payment_events_signature_verified_check;
alter table public.payment_events
  drop constraint if exists payment_events_verification_method_check;
alter table public.payment_events
  add constraint payment_events_verification_method_check
  check (verification_method in ('webhook_hmac','provider_session_api'));
alter table public.payment_events
  add constraint payment_events_signature_method_check
  check (
    (verification_method = 'webhook_hmac' and signature_verified = true)
    or
    (verification_method = 'provider_session_api' and signature_verified = false)
  );

create or replace function public.reconcile_kashier_session_status(
  p_event_fingerprint text,
  p_provider_reference text,
  p_provider_session_id text,
  p_provider_status text,
  p_amount_minor bigint,
  p_captured_minor bigint,
  p_refunded_minor bigint,
  p_currency text,
  p_merchant_id text,
  p_expected_merchant_id text,
  p_provider_transaction_id text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public, private
as $function$
declare
  v_event_id uuid;
  v_order public.payment_orders%rowtype;
  v_status text := upper(left(trim(coalesce(p_provider_status,'')),40));
  v_currency text := upper(left(trim(coalesce(p_currency,'')),8));
  v_result text := 'ignored';
  v_result_code text := null;
  v_changed text := null;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception using errcode='42501', message='service role required';
  end if;
  if p_event_fingerprint is null or p_event_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='invalid reconciliation fingerprint';
  end if;
  if p_provider_reference is null or length(trim(p_provider_reference)) < 1 or length(p_provider_reference) > 160 then
    raise exception using errcode='22023', message='invalid provider reference';
  end if;
  if p_provider_session_id is null or length(trim(p_provider_session_id)) < 8 or length(trim(p_provider_session_id)) > 100 then
    raise exception using errcode='22023', message='invalid provider session';
  end if;
  if p_amount_minor is null or p_amount_minor < 1 or p_captured_minor is null or p_captured_minor < 0
     or p_refunded_minor is null or p_refunded_minor < 0 or v_currency <> 'EGP' then
    raise exception using errcode='22023', message='invalid reconciliation amounts';
  end if;

  insert into public.payment_events(
    provider,event_fingerprint,event_type,provider_status,provider_transaction_id,
    amount_minor,currency,signature_verified,verification_method,result,request_id,metadata
  )
  values (
    'kashier',p_event_fingerprint,'session_status_reconciled',v_status,
    nullif(left(trim(coalesce(p_provider_transaction_id,'')),160),''),
    p_amount_minor,v_currency,false,'provider_session_api','received',
    left(coalesce(p_request_id,''),100),
    jsonb_build_object('source','kashier_session_api','sessionId',left(p_provider_session_id,100))
  )
  on conflict (event_fingerprint) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('result','duplicate','duplicate',true);
  end if;

  select * into v_order
  from public.payment_orders
  where provider='kashier'
    and provider_reference=trim(p_provider_reference)
    and provider_session_id=trim(p_provider_session_id)
  for update;

  if not found then
    v_result := 'unmatched';
    v_result_code := 'provider_session_order_not_found';
    insert into public.security_events(actor_user_id,event_type,severity,endpoint,request_id,metadata)
    values (null,'kashier_session_unmatched_order','high','/functions/v1/kashier-payment',
      left(coalesce(p_request_id,''),100),
      jsonb_build_object('merchantReference',left(p_provider_reference,80),'sessionId',left(p_provider_session_id,100)));
  elsif p_merchant_id is null or trim(p_merchant_id) <> trim(coalesce(p_expected_merchant_id,'')) then
    v_result := 'rejected';
    v_result_code := 'merchant_mismatch';
    insert into public.security_events(actor_user_id,event_type,severity,endpoint,request_id,metadata)
    values (null,'kashier_session_merchant_mismatch','critical','/functions/v1/kashier-payment',
      left(coalesce(p_request_id,''),100),
      jsonb_build_object('orderId',v_order.id,'receivedMerchantId',left(coalesce(p_merchant_id,''),80)));
  elsif p_amount_minor <> v_order.amount_minor or v_currency <> 'EGP' or v_order.currency <> 'EGP' then
    v_result := 'rejected';
    v_result_code := 'amount_or_currency_mismatch';
    insert into public.security_events(actor_user_id,event_type,severity,endpoint,request_id,metadata)
    values (null,'kashier_session_amount_currency_mismatch','critical','/functions/v1/kashier-payment',
      left(coalesce(p_request_id,''),100),
      jsonb_build_object('orderId',v_order.id,'expectedAmountMinor',v_order.amount_minor,'receivedAmountMinor',p_amount_minor,'receivedCurrency',v_currency));
  else
    if v_status in ('PAID','CAPTURED','SUCCESS')
       and p_captured_minor = v_order.amount_minor and p_refunded_minor = 0 then
      if v_order.status='paid' then
        v_result := 'already_paid';
        v_result_code := 'already_paid';
      elsif v_order.status='refunded' then
        v_result := 'invalid_transition';
        v_result_code := 'refunded_order_cannot_be_repaid';
      elsif v_order.status not in ('pending','checkout_created') then
        v_result := 'invalid_transition';
        v_result_code := 'order_not_payable';
      else
        update public.payment_orders
        set status='paid',
            provider_transaction_id=coalesce(nullif(trim(coalesce(p_provider_transaction_id,'')),''),provider_transaction_id),
            paid_at=coalesce(paid_at,now()),
            updated_at=now(),
            provider_payload=coalesce(provider_payload,'{}'::jsonb) ||
              jsonb_build_object('last_status_reconciliation','paid','verified_by','kashier_session_api',
                'provider_session_status',v_status,'captured_minor',p_captured_minor,'refunded_minor',p_refunded_minor)
        where id=v_order.id and status in ('pending','checkout_created');
        if found then
          v_result := 'paid';
          v_result_code := 'session_status_confirmed_payment';
          v_changed := 'paid';
        else
          v_result := 'invalid_transition';
          v_result_code := 'concurrent_status_change';
        end if;
      end if;
    elsif v_status in ('REFUNDED','REVERSED','VOIDED')
       and p_captured_minor >= v_order.amount_minor and p_refunded_minor >= v_order.amount_minor then
      if v_order.status='refunded' then
        v_result := 'already_paid';
        v_result_code := 'already_refunded';
      else
        update public.payment_orders
        set status='refunded',
            paid_at=coalesce(paid_at,now()),
            updated_at=now(),
            provider_payload=coalesce(provider_payload,'{}'::jsonb) ||
              jsonb_build_object('last_status_reconciliation','refunded','verified_by','kashier_session_api',
                'provider_session_status',v_status,'captured_minor',p_captured_minor,'refunded_minor',p_refunded_minor)
        where id=v_order.id and status in ('pending','checkout_created','paid','failed');
        if found then
          v_result := 'requires_reconciliation';
          v_result_code := 'full_refund_confirmed';
          v_changed := 'refunded';
        else
          v_result := 'invalid_transition';
          v_result_code := 'concurrent_status_change';
        end if;
      end if;
    elsif p_refunded_minor > 0 then
      v_result := 'requires_reconciliation';
      v_result_code := 'partial_refund_requires_manual_review';
      insert into public.security_events(actor_user_id,event_type,severity,endpoint,request_id,metadata)
      values (null,'kashier_partial_refund_requires_review','high','/functions/v1/kashier-payment',
        left(coalesce(p_request_id,''),100),
        jsonb_build_object('orderId',v_order.id,'capturedMinor',p_captured_minor,'refundedMinor',p_refunded_minor,'providerStatus',v_status));
    elsif v_status in ('FAILED','FAILURE','EXPIRED','ABANDONED','REJECTED') then
      if v_order.status in ('pending','checkout_created') then
        update public.payment_orders
        set status='failed',updated_at=now(),
            provider_payload=coalesce(provider_payload,'{}'::jsonb) ||
              jsonb_build_object('last_status_reconciliation','failed','verified_by','kashier_session_api','provider_session_status',v_status)
        where id=v_order.id and status in ('pending','checkout_created');
        if found then
          v_result := 'failed';
          v_result_code := 'session_status_confirmed_failure';
          v_changed := 'failed';
        else
          v_result := 'invalid_transition';
          v_result_code := 'concurrent_status_change';
        end if;
      else
        v_result := 'invalid_transition';
        v_result_code := 'failure_cannot_reverse_final_order';
      end if;
    else
      v_result := 'ignored';
      v_result_code := 'session_not_in_final_payable_state';
    end if;
  end if;

  update public.payment_events
  set payment_order_id=v_order.id,
      result=v_result,
      result_code=v_result_code,
      processed_at=now()
  where id=v_event_id;

  if v_changed is not null then
    insert into public.audit_logs(actor_user_id,action,target_type,target_id,metadata)
    values (null,'payment_status_reconciled','payment_order',v_order.id::text,
      jsonb_build_object('newStatus',v_changed,'providerStatus',v_status,'source','kashier_session_api'));
  end if;

  return jsonb_build_object('result',v_result,'orderId',v_order.id,'duplicate',false);
end;
$function$;

revoke all on function public.reconcile_kashier_session_status(text,text,text,text,bigint,bigint,bigint,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.reconcile_kashier_session_status(text,text,text,text,bigint,bigint,bigint,text,text,text,text,text) to service_role;

notify pgrst, 'reload schema';
