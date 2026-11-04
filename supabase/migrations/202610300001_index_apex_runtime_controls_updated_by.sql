-- Adds the missing covering index reported by Supabase performance advisors.
-- Safe, additive migration; no existing rows are modified.
create index if not exists apex_runtime_controls_updated_by_idx
  on public.apex_runtime_controls (updated_by)
  where updated_by is not null;
