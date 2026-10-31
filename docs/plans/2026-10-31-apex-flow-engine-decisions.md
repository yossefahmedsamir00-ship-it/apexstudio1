# APEX FLOW ENGINE — Phase 0 Technical Decisions

**Status:** Discovery recommendation — review before implementation  
**Date:** 2026-10-31  
**Repository:** `yossefahmedsamir00-ship-it/apexstudio1`  
**Branch:** `docs/apex-flow-engine-design`

## 1. Executive decision

Proceed with a separate APEX FLOW web application and an independent always-on worker, while retaining the existing Supabase project as the identity and data foundation.

Recommended initial deployment:
- **Web UI:** Cloudflare Pages, separate project and deployment from the existing APEX STUDIO site.
- **Control-plane API:** Supabase Edge Functions initially, with a dedicated `apex-flow-api` function namespace and shared typed contracts. Reassess a separate API service only if request duration, networking, or operational requirements demand it.
- **Database:** Existing Supabase Postgres project `dyoaiszrmfrdxgouzgzq`; all Flow tables introduced only through reviewed migrations.
- **Queue:** A dedicated durable Postgres queue table with atomic claim/lease RPCs using `FOR UPDATE SKIP LOCKED`; do not depend on Supabase Queues/PGMQ for the first production version while the official feature page labels Queues Public Alpha.
- **Worker and scheduler:** A continuously running TypeScript/Node.js worker on Fly.io Machines. It polls/claims due work, runs the scheduler loop, heartbeats leases, and processes bounded node tasks. The browser and Flutter app are not involved in execution.
- **Secrets:** Existing Supabase private-schema pattern for encrypted social credentials is a useful precedent, but encryption/key handling must be audited. New Flow credentials must use envelope encryption with a separately managed master key; the key itself is never stored in Postgres.

This is a recommended architecture, not a deployment. No hosting resources, secrets, or database objects were created.

## 2. Repository inventory — verified observations

### Existing app and deployment
- Flutter Admin lives under `flutter_admin/`; `pubspec.yaml` uses Flutter, `supabase_flutter`, `flutter_test`, and `flutter_lints`.
- `flutter_admin/lib/main.dart` contains the app bootstrap and a large portion of current UI/state. New Flow screens should be isolated under `lib/features/flow/`; avoid broad rewrites of the existing entry point.
- `.github/workflows/flutter-admin.yml` runs Flutter setup, `flutter pub get`, `flutter analyze`, `flutter test`, and a debug APK build.
- `.github/workflows/deploy.yml` builds the existing `apex/` Vite project and deploys it to GitHub Pages on pushes to `main`. It should not be repurposed to deploy APEX FLOW; create an independent Pages project/build configuration.
- Existing frontend deployment exposes only Supabase URL and publishable key as build variables. Preserve that rule.

### Existing Supabase foundation
- Existing project reference: `dyoaiszrmfrdxgouzgzq`.
- Existing migrations inspected: 13 files, from 2026-10-28 through 2026-10-31.
- Existing Edge Function folders include `apex-owner-bootstrap`, `apex-ai-gateway`, `apex-client-chat`, Kashier functions, and `social-api`.
- Existing Supabase migration history already creates common owner/security/payment/client-chat structures and Social AI tables. Flow migrations must be additive and must not rewrite or reorder existing migrations.
- Existing private schema is used for Social AI provider credentials; public social tables have RLS and FORCE RLS, and client roles are revoked from direct table access.
- Existing Social AI security test checks RLS/FORCE RLS, client-role SELECT denial, private credential access, tenant constraints, and seed tenant presence.

### Existing Social AI — reuse, do not duplicate
Existing Social AI schema already contains:
- `social_tenants`, `social_memberships`, `social_accounts`
- `social_campaigns`, `social_content_items`, `social_content_versions`
- `social_media_assets`, `social_approvals`
- `social_publish_jobs`, `social_publish_attempts`
- `social_analytics_snapshots`, `social_workflow_runs`, `social_audit_events`
- `private.social_account_secrets`
- Additional Brand Brain and UGC tables.

The Social AI spec currently targets Instagram, Facebook Pages, TikTok, and YouTube. Other platforms remain future capability candidates, not an assumption that official publishing APIs are available.

**Decision:** APEX FLOW owns generic workflow definitions, workflow revisions, execution runs, node runs, schedules, queue jobs, and module registry. The Social module references existing Social AI content/account/approval/publish entities through explicit adapters. Do not create duplicate `flow_social_accounts`, `flow_social_posts`, or a second social approval system.

Existing `social_workflow_runs` is Social AI subsystem history; it is not the canonical run store for the general workflow engine.

## 3. Owner authentication and authorization finding

The current `apex-owner-bootstrap` function:
- Calls Supabase `auth.getUser(token)`.
- Requires a confirmed email matching a hard-coded owner email.
- Reads `apex_owner_settings` and can claim an empty owner slot.
- Returns a `configured` response and records access events.

The Social AI API contract specifies the stronger ongoing authorization rule: after validating the access token, verify the caller against the authoritative `apex_owner_settings.owner_user_id`. Email matching or client-supplied roles are not sufficient authorization evidence.

**Decision:**
1. Do not use the bootstrap endpoint as the general Flow API authorization guard.
2. The Flow API validates the Supabase access token server-side and checks the authenticated `user.id` against the already configured `apex_owner_settings.owner_user_id` on every protected request.
3. If owner setup is absent or inconsistent, fail closed and require a separate reviewed owner-recovery procedure.
4. Do not allow Flow endpoints to claim/change the owner identity.
5. Never trust Flutter/browser role flags, owner IDs, tenant IDs, or hidden UI controls.

**Pre-implementation check:** verify the deployed function and live owner row in the actual Supabase project using authorized project access. Repository source alone does not prove deployed state.

## 4. Hosting and queue comparison

### Web frontend

| Option | Advantages | Limitations | Decision |
|---|---|---|---|
| Existing GitHub Pages pipeline | Already configured in repo | Tied to current `apex/` build; would couple Flow releases to existing site workflow | Do not reuse the existing deployment |
| Cloudflare Pages | Independent project, Git-based deploy, static assets served free; official limits show 500 builds/month on Free | Static hosting only; secrets and long-running work must remain elsewhere | **Recommended for Flow web UI** |
| Fly.io app serving frontend | Same provider as worker, one operational vendor | More compute than a static UI requires | Not preferred for static frontend |

### Worker hosting

| Option | Advantages | Limitations | Decision |
|---|---|---|---|
| Fly.io Machines | Long-lived machine model, per-second compute billing, explicit resource sizing, persistent worker process | Region affects price/latency; storage and egress billed separately; more ops responsibility | **Recommended initial worker host** |
| Render Background Workers | Explicit background-worker service type, simpler managed deployment experience | Compute cost must be selected from service instance pricing; less granular cost shape than a tiny always-on machine | Viable alternative |
| Supabase Edge Functions only | Existing platform and low operational overhead for request/response work | Not a permanent worker process; do not use as the only execution runtime for long-running jobs | Use for control-plane endpoints, not the worker loop |

### Initial Fly sizing estimate

Use one shared worker machine initially, starting at approximately 1 GB RAM. The current Fly pricing update lists a 1 GB shared-cpu-4x machine at about **US$8.78/month** in its displayed pricing table. Actual region-specific pricing, volume storage, snapshots, and network egress are additional and must be confirmed in the Fly calculator before provisioning. This is a compute estimate, not a complete project bill.

Start with one worker process and bounded concurrency. Add another machine only after load and recovery tests show it is needed. Do not run browser automation or video transcoding in the initial worker.

### Queue decision

Supabase documents PGMQ/Supabase Queues as durable Postgres-backed queues, but its official feature listing currently labels the Queues feature **Public Alpha**. For the first production-capable foundation, use an application-owned logged Postgres queue table with:
- Atomic claims using `FOR UPDATE SKIP LOCKED`.
- Lease token, lease expiry, heartbeat, and bounded visibility timeout.
- Unique idempotency key for each trigger occurrence.
- Retry schedule and dead-letter state.
- Transactional enqueue with run creation.
- Worker-only database access through a restricted server-side role/RPC boundary.

Keep a queue adapter interface so PGMQ or an external queue can be evaluated later without changing workflow semantics. Revisit PGMQ after its maturity/support status is suitable for the production risk level.

## 5. Scheduler decision

The always-on worker owns a small scheduler loop:
1. Query due schedule rows in bounded batches.
2. Create one run per schedule occurrence using a deterministic idempotency key.
3. Insert the queue job in the same transaction as run creation.
4. Advance the next scheduled occurrence.
5. Emit structured metrics for scheduler lag and duplicate suppression.

Do not rely on a browser timer, phone background task, GitHub Actions schedule, or a short-lived Edge Function invocation for the primary scheduler. A database cron trigger can be considered as a wake-up/backup mechanism later, but it must not be the only correctness boundary.

## 6. Secrets and encryption decision

Existing Social AI schema stores ciphertext fields in `private.social_account_secrets` and documents that encryption/decryption occurs in trusted Edge Functions using externally managed keys. The migration defines storage and access controls; it does not itself prove that encryption implementation, key rotation, or deployment secrets are correctly configured.

For new Flow credentials:
- Store only metadata and encrypted ciphertext in a private schema/table.
- Use envelope encryption with a master key held in a managed secret/KMS service, never in Postgres or client bundles.
- Store a key version identifier beside ciphertext.
- Implement rotation and re-encryption procedure before production.
- Ensure logs, traces, error messages, backups, and client responses never expose plaintext credentials.
- Use separate credentials per integration and least-privilege scopes.
- Do not copy Social AI token code without reviewing its actual encryption implementation and secret provisioning.

**Open implementation decision:** select the concrete KMS/secret manager after verifying the hosting region and account capabilities. Do not silently substitute a plaintext environment variable as a long-term credential vault.

## 7. Authorization matrix — proposed default

| Action | Flutter Admin | APEX FLOW Web | Server rule |
|---|---|---|---|
| View workflow list and status | Yes | Yes | Verified owner |
| Create/edit draft workflow | Guided/simple edits | Full Visual/Simple/Hybrid | Verified owner; strict schema validation |
| Validate/test workflow | Yes, safe test only | Yes | Sandbox/test policy |
| Activate/deactivate workflow | Yes, confirmation | Yes, confirmation | Owner re-check + audit |
| Pause/cancel a running workflow | Yes, if supported | Yes | Server state transition; cancellation is cooperative |
| Approve consequential external action | Yes, explicit confirmation | Yes, explicit confirmation | Exact revision/payload/target binding |
| View run history/logs | Yes, redacted | Yes, detailed redacted | Verified owner; secret redaction |
| Configure AI provider/model policy | No | Yes | Server-only secrets; audit |
| Create/rotate/revoke credentials | No | Yes | Re-authentication/confirmation; never return secret |
| Install/enable modules | No | Yes | Owner-only; module allowlist |
| Change permissions/security settings | No | Yes | Re-authentication, audit, fail-closed |
| Delete workflow/revision history | No | Archive only | Permanent deletion is separate, strongly confirmed and retention-aware |

Flutter is the daily operations console; web is the advanced control plane. Both clients call the same API. A client visibility rule never replaces server authorization.

## 8. Initial module scope

**Foundation release:**
- Manual trigger and schedule trigger.
- Conditions/branching and basic data mapping.
- HTTP request and signed webhook trigger, after SSRF/replay protections.
- AI text-generation/classification node through the provider router.
- Approval and notification nodes.
- Generic run history and audit.

**Social module first slice:**
- Reuse existing Social AI drafts, versions, account metadata, approvals, and publishing job model.
- Initially provide workflow orchestration around draft/review/approval and safe status reconciliation.
- Enable one official publish connector only after verifying real account eligibility, official API permissions, app review, and integration tests. Do not assume credentials or API access already exist.
- Keep other platforms as disabled capability entries until independently verified.

## 9. Notifications, retention, import/export

Provisional defaults for first implementation:
- In-app notification center is required.
- Email notifications can be added through a verified email provider after the core engine is stable.
- Do not add WhatsApp/Telegram notifications in the first slice; these introduce separate provider credentials and privacy considerations.
- Keep execution logs redacted and structured; proposed retention baseline: detailed node logs 30 days, run summaries/audit records 180 days, subject to the existing APEX data policy and legal review. Do not apply cleanup until owner confirms.
- Workflow export/import: JSON export/import for workflow definitions only, with credentials stripped and references remapped on import.
- No third-party module marketplace in Release 1; modules are owner-maintained and explicitly allowlisted.

## 10. Cost and budget controls

- Cloudflare Pages static frontend: Free plan can be used for initial UI hosting; official Pages docs show up to 500 builds/month on Free and static asset requests are free/unlimited.
- Fly worker: estimate one always-on 1 GB shared machine at approximately US$8.78/month compute in the displayed current pricing table, plus storage, snapshots, egress, and any additional machines.
- Supabase: existing project plan and usage are unknown from repository inspection; database, egress, Edge Function, and storage charges must be checked in the account before migration/deployment.
- AI provider spend is separate and variable. Add hard per-run, daily, and monthly limits before enabling AI workflows.
- No production provisioning until an explicit monthly ceiling is recorded and billing alerts are configured.

## 11. Initial decision record

| Area | Decision | Status |
|---|---|---|
| Identity | Supabase Auth + authoritative owner_user_id check | Recommended |
| Database | Existing Supabase Postgres, additive migrations | Recommended |
| Frontend | Separate Cloudflare Pages project | Recommended |
| Control API | Supabase Edge Functions initially | Recommended |
| Worker | Fly.io always-on Machine, TypeScript/Node.js | Recommended |
| Queue | App-owned logged Postgres queue + atomic lease RPCs | Recommended |
| Scheduler | Worker-owned persistent scheduler loop | Recommended |
| Secret storage | Private schema + envelope encryption + external master key | Design approved; KMS choice open |
| Flutter access | Daily workflow operations and monitoring | Confirmed product direction |
| Web access | Advanced configuration and visual authoring | Confirmed product direction |
| Social publishing | Reuse existing Social AI data; one connector after verification | Deferred until eligibility is known |
| Notifications | In-app first; email later | Provisional |
| Retention | 30-day detailed logs / 180-day summaries and audit | Provisional; owner confirmation required |
| Import/export | Credential-free workflow JSON | Provisional |
| Third-party modules | Not in Release 1 | Recommended |
| Monthly spend cap | Must be explicitly confirmed before provisioning | Open |

## 12. Risks and blockers

1. **Live Supabase state is not verified.** Repository source and migrations do not prove which migrations/functions are deployed or what the live owner row contains.
2. **Owner bootstrap is not a general authorization guard.** Build a separate server-side owner check against the authoritative owner user ID.
3. **Social token encryption requires implementation audit.** Ciphertext column names alone are not proof of correct encryption/key management.
4. **Queue maturity:** PGMQ is documented but currently marked Public Alpha; use a version-independent queue adapter and app-owned queue for initial production path.
5. **Hosting region and cost:** choose the Fly region only after checking Supabase project region and actual regional price.
6. **Existing Flutter UI is concentrated in main.dart.** Add feature-isolated screens and tests; do not refactor unrelated features during integration.
7. **Social publishing eligibility is unknown.** Keep publishing disabled until real official API prerequisites are verified.

## 13. Required checks before implementation

- Verify live Supabase project region, plan, migration state, Edge Function deployment versions, owner settings row, and available secret/KMS capabilities through authorized project access.
- Verify Fly.io region pricing and machine availability close to the Supabase region.
- Confirm Cloudflare Pages project/domain ownership and deployment path.
- Confirm actual monthly spend ceiling and billing alerts.
- Review exact social-account platform eligibility and app approval status before choosing a first publishing connector.
- Re-run repository checks from a fresh checkout and inspect full relevant migrations/functions before writing any Flow migration.

## 14. Approval gate

This document records recommended defaults, not a purchase or deployment. No production resources, secrets, database migrations, Edge Functions, or Flutter screens were changed. The next implementation slice must begin in an isolated branch and disposable/staging environment, after the live-state checks and cost ceiling are confirmed.
