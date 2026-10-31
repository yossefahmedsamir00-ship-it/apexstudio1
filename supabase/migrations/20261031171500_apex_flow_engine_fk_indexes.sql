-- Covering indexes for Flow Engine foreign keys, added after live advisor review.
begin;
create index if not exists flow_approvals_decided_by_idx
  on public.flow_approvals (decided_by);
create index if not exists flow_approvals_operation_owner_fk_idx
  on public.flow_approvals (operation_id, owner_user_id);
create index if not exists flow_assets_owner_user_idx
  on public.flow_assets (owner_user_id);
create index if not exists flow_assets_scene_owner_fk_idx
  on public.flow_assets (scene_id, owner_user_id);
create index if not exists flow_audit_events_actor_user_idx
  on public.flow_audit_events (actor_user_id);
create index if not exists flow_financial_entries_operation_owner_fk_idx
  on public.flow_financial_entries (operation_id, owner_user_id);
create index if not exists flow_operation_steps_owner_user_idx
  on public.flow_operation_steps (owner_user_id);
create index if not exists flow_operation_steps_operation_owner_fk_idx
  on public.flow_operation_steps (operation_id, owner_user_id);
create index if not exists flow_operations_request_owner_fk_idx
  on public.flow_operations (request_id, owner_user_id);
create index if not exists flow_publishing_drafts_operation_owner_fk_idx
  on public.flow_publishing_drafts (operation_id, owner_user_id);
create index if not exists flow_scenes_owner_user_idx
  on public.flow_scenes (owner_user_id);
create index if not exists flow_scenes_project_owner_fk_idx
  on public.flow_scenes (project_id, owner_user_id);
create index if not exists flow_video_projects_operation_owner_fk_idx
  on public.flow_video_projects (operation_id, owner_user_id);
commit;
