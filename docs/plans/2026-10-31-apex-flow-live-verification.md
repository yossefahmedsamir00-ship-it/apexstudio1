# APEX FLOW ENGINE — Live Environment Verification Report

**Date:** 2026-10-31  
**Status:** Read-only verification completed  
**Project:** `dyoaiszrmfrdxgouzgzq`  
**Repository branch:** `docs/apex-flow-engine-design`

## 1. Verification scope

This report records checks made against the connected Supabase project using read-only project metadata, schema inventory, migration inventory, deployed Edge Function metadata/source, SQL inspection, and Supabase security/performance advisors.

No database DDL, migration, Edge Function deployment, secret change, billing change, or production configuration change was performed.

## 2. Live project facts

| Check | Observed result |
|---|---|
| Supabase project | `dyoaiszrmfrdxgouzgzq` |
| Project status | `ACTIVE_HEALTHY` |
| Region | `eu-west-2` |
| PostgreSQL | 17.11.0.003 / engine 17 |
| Organization plan | Free |
| Migration history | 17 migrations recorded |
| Active Edge Functions | 6 |
| Owner settings row | Exists |
| Owner user configured | Yes |

The owner identity value was deliberately not included in this report.

The active Edge Functions observed are `apex-ai-gateway`, `apex-owner-bootstrap`, `kashier-create-invoice`, `kashier-payment`, `kashier-webhook`, `apex-client-chat`, and `social-api`. There are seven names in this list; the live API inventory count is seven. (The earlier dashboard summary count of six was a counting error; use the enumerated list as authoritative.)

## 3. Live database inventory

The live project contains the existing APEX client, owner, payments, runtime controls, and Social AI structures. In particular, Social AI objects are already present:
- `social_tenants`, `social_memberships`, `social_accounts`
- `social_campaigns`, `social_content_items`, `social_content_versions`
- `social_media_assets`, `social_approvals`
- `social_publish_jobs`, `social_publish_attempts`
- `social_analytics_snapshots`, `social_workflow_runs`, `social_audit_events`
- `private.social_account_secrets`
- Brand Brain and UGC tables.

The existing schema inventory contains no `flow_workflows`, `flow_runs`, `flow_node_runs`, or `flow_queue_jobs` tables. The engine's persistence layer is not implemented.

All listed public tables in the inventory have RLS enabled. The inventory tool also flags `private.apex_rate_limit_buckets` as having RLS disabled. A direct grants inspection showed table privileges only for `postgres` and `service_role`, with no `anon` or `authenticated` table grants in that result. Therefore, treat this as a defense-in-depth / advisor finding requiring review of schema exposure and effective grants, not as proof that unauthenticated clients can currently read it.

The inventory tool supplied this remediation SQL:
```sql
ALTER TABLE "private"."apex_rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
```
Do not run this blindly: first inspect service-role-only access and confirm that no required application path relies on a client policy. Enabling RLS without appropriate policies can block access. This table is not part of APEX FLOW; remediation belongs to a separate existing-project security task.

## 4. Owner authentication finding — confirmed

The live `apex-owner-bootstrap` Edge Function source:
- Validates the supplied access token through Supabase Auth `getUser(token)`.
- Requires a confirmed email and checks it against a configured owner email.
- Uses a privileged client to read and, if empty, claim `apex_owner_settings.owner_user_id`.
- Returns success when the stored owner ID matches the authenticated user.

The live database currently has an owner settings row and a non-null owner user ID.

**APEX FLOW rule:** do not call `apex-owner-bootstrap` as a routine authorization guard and do not expose its owner-claim behavior through Flow. A Flow request must validate the access token, then compare the authenticated `user.id` with the already configured `apex_owner_settings.owner_user_id` on every protected request. If the owner row is missing, null, or unreadable, fail closed. Do not reveal the configured owner identity in API responses.

The current bootstrap source contains a hard-coded owner email. This report intentionally does not repeat it. Keep that existing function unchanged during Flow implementation; review it separately if the owner model is to be modernized.

## 5. Security advisor findings

The live security advisor reported:
- Two authenticated-callable `SECURITY DEFINER` functions in the public schema: `get_apex_runtime_controls()` and `set_apex_emergency_lockdown(boolean,text)`.
- Anonymous-role policies on several existing client/payment tables, including conversations, messages, profiles, payment orders, inquiries, and site events.
- Leaked-password protection disabled in Supabase Auth.
- One RLS-disabled table in the private schema, `private.apex_rate_limit_buckets`, as noted above.

These are existing APEX project findings, not newly introduced by APEX FLOW. Do not automatically alter them as part of the Flow work. Review each function's intended caller and body, public execute grants, schema exposure, and the anonymous-access threat model. Include the findings in a separate remediation backlog.

Remediation references:
- [SECURITY DEFINER function exposure](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Anonymous access policies](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins)
- [Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 6. Performance advisor findings

The performance advisor reported 25 unindexed foreign-key findings and 27 unused-index findings. These are informational findings on existing APEX/Social AI tables. They should be prioritized by real query patterns and workload, not blindly auto-fixed or removed. The Flow migration must add indexes for its own foreign keys, queue claim predicates, due schedules, and run history access paths.

## 7. Hosting and cost implications

The connected Supabase organization is on the Free plan. This is a verified account-level fact, but it does not establish current remaining quotas or the precise effect of usage/billing limits.

The existing project region is London (`eu-west-2`). Keep a worker deployment geographically close to the database after checking the chosen provider's actual region availability, pricing, egress, and latency.

No Fly.io, Cloudflare, or other hosting account has been connected or provisioned in this work. No recurring cost has been incurred. Before creating an always-on worker, the owner must set a monthly spending ceiling and explicitly approve the selected hosting price. A separate paid Supabase development branch/project must not be created without checking its quote and receiving cost approval.

## 8. Verified implementation blockers and next safe steps

1. Choose and approve a monthly operating budget and worker host/region.
2. Confirm whether the existing Free Supabase plan's operational limits are acceptable for staging and later production.
3. Keep all Flow changes additive and isolated; do not touch existing payment, chat, owner bootstrap, or Social AI functions.
4. Create the first Flow database design only after the queue/worker architecture is approved.
5. Add owner-only API authorization based on the existing configured owner UUID, without exposing it to clients.
6. Test all new tables with RLS, negative authorization tests, and advisors in a disposable/staging database.
7. Do not deploy an always-on worker or activate external social publishing until a host is approved and integration eligibility is verified.

## 9. Verification result

**Read-only live checks:** completed.  
**New APEX FLOW database objects:** none.  
**New Edge Functions deployed:** none.  
**Worker/scheduler running:** no.  
**Production changed:** no.  
**Automated application tests:** not run; no Flow application code exists yet.

This report corrects the earlier preliminary note: the live Edge Function inventory contains seven active functions, not six. The count is taken from the enumerated live API response.
