-- Enforce tenant consistency at the database boundary, not only in application queries.
alter table public.social_campaigns
  add constraint social_campaigns_tenant_id_id_unique unique (tenant_id,id);

alter table public.social_accounts
  add constraint social_accounts_tenant_id_id_unique unique (tenant_id,id);

alter table public.social_content_items
  add constraint social_content_items_tenant_id_id_unique unique (tenant_id,id);

alter table public.social_approvals
  add constraint social_approvals_tenant_id_id_unique unique (tenant_id,id);

alter table public.social_publish_jobs
  add constraint social_publish_jobs_tenant_id_id_unique unique (tenant_id,id);

alter table public.social_publish_attempts
  add constraint social_publish_attempts_tenant_id_id_unique unique (tenant_id,id);

alter table public.social_content_items
  add constraint social_content_campaign_same_tenant_fk
  foreign key (tenant_id,campaign_id)
  references public.social_campaigns(tenant_id,id)
  on delete set null (campaign_id);

alter table public.social_content_versions
  add constraint social_content_versions_item_same_tenant_fk
  foreign key (tenant_id,content_item_id)
  references public.social_content_items(tenant_id,id)
  on delete cascade;

alter table public.social_media_assets
  add constraint social_media_assets_item_same_tenant_fk
  foreign key (tenant_id,content_item_id)
  references public.social_content_items(tenant_id,id)
  on delete cascade;

alter table public.social_approvals
  add constraint social_approvals_item_same_tenant_fk
  foreign key (tenant_id,content_item_id)
  references public.social_content_items(tenant_id,id)
  on delete cascade;

alter table public.social_publish_jobs
  add constraint social_publish_item_same_tenant_fk
  foreign key (tenant_id,content_item_id)
  references public.social_content_items(tenant_id,id)
  on delete cascade;

alter table public.social_publish_jobs
  add constraint social_publish_account_same_tenant_fk
  foreign key (tenant_id,social_account_id)
  references public.social_accounts(tenant_id,id)
  on delete restrict;

alter table public.social_publish_jobs
  add constraint social_publish_approval_same_tenant_fk
  foreign key (tenant_id,approval_id)
  references public.social_approvals(tenant_id,id)
  on delete restrict;

alter table public.social_publish_attempts
  add constraint social_attempt_job_same_tenant_fk
  foreign key (tenant_id,publish_job_id)
  references public.social_publish_jobs(tenant_id,id)
  on delete cascade;

alter table public.social_analytics_snapshots
  add constraint social_analytics_account_same_tenant_fk
  foreign key (tenant_id,social_account_id)
  references public.social_accounts(tenant_id,id)
  on delete cascade;

alter table public.social_analytics_snapshots
  add constraint social_analytics_item_same_tenant_fk
  foreign key (tenant_id,content_item_id)
  references public.social_content_items(tenant_id,id)
  on delete set null (content_item_id);

-- Bind approvals and publish jobs to the exact content item/version, not merely
-- to records that happen to share a tenant.
alter table public.social_content_versions
  add constraint social_content_versions_tenant_item_id_unique
  unique (tenant_id,content_item_id,id);

alter table public.social_approvals
  add constraint social_approvals_version_same_item_fk
  foreign key (tenant_id,content_item_id,content_version_id)
  references public.social_content_versions(tenant_id,content_item_id,id)
  on delete restrict;

alter table public.social_approvals
  add constraint social_approvals_tenant_item_version_id_unique
  unique (tenant_id,content_item_id,content_version_id,id);

alter table public.social_publish_jobs
  add constraint social_publish_approval_same_item_version_fk
  foreign key (tenant_id,content_item_id,content_version_id,approval_id)
  references public.social_approvals(tenant_id,content_item_id,content_version_id,id)
  on delete restrict;
