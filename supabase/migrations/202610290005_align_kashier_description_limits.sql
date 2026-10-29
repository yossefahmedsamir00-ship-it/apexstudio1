-- Keep invoice descriptions within the provider's documented limit (fewer than 120 chars).
-- Existing data was checked before this change: there are currently no payment_orders rows.
alter table public.payment_orders
  drop constraint if exists payment_orders_description_check;

alter table public.payment_orders
  add constraint payment_orders_description_check
  check (length(trim(description)) between 1 and 119);

notify pgrst, 'reload schema';
