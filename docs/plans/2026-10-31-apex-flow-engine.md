# APEX FLOW ENGINE Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, owner-operated automation engine with one versioned workflow model, a durable cloud execution runtime, a web builder, and safe daily controls in the existing Flutter Admin app.

**Architecture:** Preserve the current Supabase Auth/owner-verification foundation and add a separately deployed control-plane API plus durable scheduler/queue/worker runtime. The web app and Flutter Admin remain presentation clients that call the same authenticated API. A single canonical workflow definition supports Visual, Simple, and Hybrid authoring modes.

**Tech Stack:** Existing Flutter 3 / Dart app with `supabase_flutter`; existing Supabase Postgres, Auth, Edge Functions, migrations and RLS; TypeScript is the recommended language for a new web/control-plane/worker workspace, subject to the hosting/runtime decision in Task 1. No permanent execution work may depend on a browser session or a short-lived request handler.

## Global Constraints

- Private, single-owner APEX STUDIO operations in Release 1; do not introduce public tenant onboarding.
- Reuse the existing Supabase Auth and owner verification only after verifying the deployed `apex-owner-bootstrap` behavior. Never trust client-supplied roles, owner IDs, or tenant IDs.
- Flutter and browser clients use publishable configuration only. Service-role/secret keys, provider tokens, encryption keys, and refresh tokens remain server-side.
- RLS is enabled on every exposed table. Secret-bearing records are inaccessible to browser/mobile roles.
- Both clients use the same API contracts; sensitive authorization is checked server-side for every request.
- Engine execution is independent of browser, website, Flutter app, and local computer availability.
- All authoring modes serialize to the same versioned workflow model.
- Workflow revisions used by runs are immutable. Editing creates a new revision.
- Assume at-least-once queue delivery. Use idempotency keys, atomic claims/leases, bounded retries, and safe recovery.
- AI may draft, classify, analyze, and recommend. AI cannot approve or publish.
- External publishing and consequential actions require explicit owner approval bound to the exact content/workflow revision and target.
- Use documented official integrations only. Never scrape, collect platform passwords, or bypass provider restrictions.
- Do not fabricate connected-account state, provider metrics, job completion, or publishing success.
- Arabic/English and RTL/LTR support are required across core screens.
- Preserve existing app functionality and existing Social AI/n8n foundation. Do not merge or rewrite PR #11 as part of this plan.
- No production deployment, live social account connection, or external publishing until security and acceptance gates pass.
- Recommendations in this plan (TypeScript, modular control plane, independent worker, React Flow) are engineering recommendations, not immutable product requirements.

---

## Repository facts and boundaries

Observed in the current repository:
- `flutter_admin/lib/main.dart` is the existing Flutter app entry point and currently contains a large portion of the app UI/state.
- `flutter_admin/pubspec.yaml` uses Flutter, `supabase_flutter`, `flutter_test`, and `flutter_lints`; CI documentation specifies `flutter pub get`, `flutter analyze`, and `flutter test`.
- `supabase/migrations/` contains the existing database migration history; inspect all current migrations before creating new schema.
- `supabase/functions/apex-owner-bootstrap`, `apex-ai-gateway`, and Social AI functions are existing integration points.
- `docs/APEX_SOCIAL_AI_SPEC.md` and `docs/APEX_SOCIAL_AI_API_CONTRACTS.md` describe existing Social AI concepts and safeguards.
- `supabase/tests/social_ai_security.sql` is an existing SQL security-test artifact.
- No APEX FLOW Engine implementation workspace or worker package was observed in the inspected paths. New paths below are proposed and must be reconciled against a fresh branch checkout before creation.

## Task 1: Runtime and repository discovery gate

**Files:**
- Read: `supabase/config.toml` (verify whether present; do not assume)
- Read: all files in `supabase/migrations/`
- Read: `supabase/functions/apex-owner-bootstrap/`
- Read: `supabase/functions/apex-ai-gateway/`
- Read: `flutter_admin/lib/main.dart`
- Read: `.github/workflows/` (verify actual workflow names)
- Create: `docs/plans/2026-10-31-apex-flow-engine-decisions.md`

**Interfaces:**
- Consumes: current owner auth pattern, existing database objects, current deployment/CI conventions.
- Produces: a signed-off technical decision record for worker hosting, queue, scheduler, secret encryption, permission matrix, retention, and first connector. No implementation schema is created in this task.

- [ ] **Step 1: Inventory the existing backend and app**
  
  Enumerate existing tables, schemas, RLS policies, RPCs, Edge Functions, environment secrets by name only (never values), Flutter navigation/state boundaries, CI commands, and existing Social AI tables. Identify collisions with proposed `flow_*` names.

- [ ] **Step 2: Verify current owner verification**
  
  Trace `apex-owner-bootstrap` from request authentication through `auth.getUser`, owner identity resolution, response envelope, and denial behavior. Confirm the Flutter app's current invocation and session lifecycle. Record any mismatch; do not change the deployed function during discovery.

- [ ] **Step 3: Compare hosting and queue candidates**
  
  Compare at least two viable always-on worker/queue options against monthly baseline cost, regional availability, persistent queue semantics, deploy simplicity, retry/lease support, observability, and secrets management. Verify current vendor documentation and pricing at decision time. Do not select a free tier that sleeps or cannot guarantee the required worker lifecycle.

- [ ] **Step 4: Write decision record**
  
  Record selected hosting/queue/scheduler, worker runtime, secret encryption/key management, exact Flutter-vs-web permission matrix, initial social connector (or explicitly defer social publishing), notification channel, retention, backup/restore objectives, and workflow import/export scope. Each decision must include rationale and a rollback/alternative.

- [ ] **Step 5: Verify discovery artifact**
  
  Review every decision against the product design and current repository. Confirm no production files or database objects changed.

**Review gate:** Do not start Task 2 until the decision record resolves the deployment and queue architecture and confirms the existing schema/auth integration points.

## Task 2: Canonical workflow contract and validator

**Files:**
- Create: `apex-flow/packages/contracts/src/workflow.ts` (proposed)
- Create: `apex-flow/packages/contracts/src/node.ts` (proposed)
- Create: `apex-flow/packages/contracts/src/errors.ts` (proposed)
- Create: `apex-flow/packages/contracts/test/workflow-validation.test.ts` (proposed)
- Create: `apex-flow/packages/contracts/package.json` and lockfile (proposed)

**Interfaces:**
- Produces `WorkflowDefinition`, `WorkflowNode`, `WorkflowEdge`, `WorkflowRevisionRef`, `ValidationIssue`, and `validateWorkflow(input): ValidationResult`.
- `validateWorkflow` is pure: it performs no network, database, filesystem, or provider calls.
- Consumes no Supabase or UI package.

- [ ] **Step 1: Add failing contract tests**
  
  Cover valid minimal trigger-to-action graph; duplicate node IDs; missing edge endpoints; unsupported node type/version; invalid node config schema; malformed trigger; unsupported cycle; unreachable node policy; invalid branch target; missing required approval marker on a consequential action; and stable validation issue paths/codes.

- [ ] **Step 2: Run focused tests**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/contracts/test/workflow-validation.test.ts`
  
  Expected: test command is available after the package scaffold and fails on the missing contract/validator behavior. If the selected TypeScript toolchain uses a different runner, document its exact command in Task 1 before this task begins.

- [ ] **Step 3: Implement minimum typed model and validator**
  
  Define explicit `schemaVersion`, workflow ID, immutable revision number, trigger, node IDs/types/versions/config, edges, execution policy, and locale/time-zone metadata. Validate graph references, unique IDs, known node versions, node-specific config schemas, allowed graph topology, and policy constraints. Return machine-readable issues without leaking config values.

- [ ] **Step 4: Verify focused pass**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/contracts/test/workflow-validation.test.ts`
  
  Expected: all contract tests pass, including malformed input and graph edge cases.

- [ ] **Step 5: Run package checks**
  
  Run: `cd apex-flow && npm run typecheck && npm run lint`
  
  Expected: zero type errors and lint errors.

- [ ] **Step 6: Commit**
  
  `git add apex-flow/packages/contracts && git commit -m "feat(flow): add canonical workflow contracts"`

## Task 3: Owner-only control-plane API and audit boundary

**Files:**
- Create: `apex-flow/apps/api/src/auth/require-owner.ts` (proposed)
- Create: `apex-flow/apps/api/src/http/response.ts` (proposed)
- Create: `apex-flow/apps/api/src/routes/workflows.ts` (proposed)
- Create: `apex-flow/apps/api/src/routes/runs.ts` (proposed)
- Create: `apex-flow/apps/api/src/routes/approvals.ts` (proposed)
- Create: `apex-flow/apps/api/src/audit/write-audit-event.ts` (proposed)
- Create: `apex-flow/apps/api/test/owner-auth.test.ts` (proposed)
- Create: `apex-flow/apps/api/test/workflow-routes.test.ts` (proposed)

**Interfaces:**
- `requireOwner(request): Promise<VerifiedOwnerContext>`
- `writeAuditEvent(context, event): Promise<void>`
- API envelope: `{ ok: true, data, request_id }` or `{ ok: false, error: { code, message }, request_id }`.
- Routes accept authenticated requests and never accept a client-supplied owner/tenant identity as authorization evidence.

- [ ] **Step 1: Add failing auth and route tests**
  
  Test missing bearer token, malformed token, expired/invalid token, authenticated non-owner, owner verification service unavailable, owner accepted, cross-workspace ID substitution, malformed JSON, oversized payload, rate-limit response, and secret-bearing field projection.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/api/test/owner-auth.test.ts apps/api/test/workflow-routes.test.ts`
  
  Expected: tests fail because route/auth implementation is absent.

- [ ] **Step 3: Implement server-side owner guard**
  
  Validate the bearer token using Supabase Auth server-side, then verify the owner using the existing authoritative owner record/pattern confirmed in Task 1. Never rely on `user_metadata`, client roles, hidden buttons, or email-only matching unless the current approved owner model explicitly requires it. Fail closed if owner verification is unavailable. Return a minimal verified context.

- [ ] **Step 4: Implement safe API envelope and initial read/write routes**
  
  Add workflow draft create/read/update and validation endpoints. Reject client writes to lifecycle/approval/provider/owner fields. Add request IDs, strict schemas, bounded payloads, CORS allowlist, no-store responses, rate limits, and audit events for mutations. Do not expose stack traces, SQL, tokens, provider bodies, or secret metadata.

- [ ] **Step 5: Verify focused and integration checks**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/api/test/owner-auth.test.ts apps/api/test/workflow-routes.test.ts && npm run typecheck && npm run lint`
  
  Expected: owner-only access tests pass; every negative auth case returns a safe denial and no workflow data.

- [ ] **Step 6: Commit**
  
  `git add apex-flow/apps/api && git commit -m "feat(flow): add owner-only control plane"`

## Task 4: Database foundation, RLS, and atomic state transitions

**Files:**
- Create: migration via `supabase migration new apex_flow_core` (exact generated filename; proposed)
- Create: `supabase/tests/apex_flow_security.sql` (proposed)
- Create: `supabase/tests/apex_flow_invariants.sql` (proposed)

**Interfaces:**
- Tables: `flow_workflows`, `flow_workflow_revisions`, `flow_runs`, `flow_node_runs`, `flow_queue_jobs`, `flow_approvals`, `flow_audit_events`, and `flow_usage_records`.
- RPCs (names to be finalized from schema review): atomic claim/lease, enqueue run, transition node/run, and create approval decision.
- All run and node states are constrained to documented enums/check constraints.

- [ ] **Step 1: Add failing SQL security/invariant tests**
  
  Test anonymous denial, authenticated non-owner denial, owner access only, no client read of secret-bearing schema, immutable revision behavior, duplicate idempotency rejection, invalid state transition rejection, lease ownership, approval-to-revision binding, and audit event creation.

- [ ] **Step 2: Verify SQL tests fail on absent objects**
  
  Run in a disposable local Supabase environment: `supabase test db` (confirm exact CLI syntax with `supabase test --help` in Task 1).
  
  Expected: tests report missing flow objects before migration. Never run a first migration against production.

- [ ] **Step 3: Inspect schema collision and add migration**
  
  Use generated migration naming. Add constraints, indexes for due jobs/status/workflow/created-at, foreign keys, immutable revision enforcement, and state-transition RPCs. Keep secret values out of these client-facing tables. If secret material needs storage, create a separate private schema or selected managed secret store in a separately reviewed task.

- [ ] **Step 4: Apply locally and verify SQL tests**
  
  Run: `supabase db reset` then `supabase test db` in a disposable local environment.
  
  Expected: migrations apply cleanly and all security/invariant tests pass.

- [ ] **Step 5: Run database advisors**
  
  Run: `supabase db advisors` when supported by the installed CLI; otherwise use the configured Supabase advisor tool. Resolve exposed-table, RLS, function privilege, and index findings before proceeding.

- [ ] **Step 6: Commit**
  
  `git add supabase/migrations supabase/tests && git commit -m "feat(flow): add secure workflow persistence"`

## Task 5: Durable queue, scheduler, worker, and node execution

**Files:**
- Create: `apex-flow/apps/worker/src/queue/claim-job.ts` (proposed)
- Create: `apex-flow/apps/worker/src/queue/heartbeat.ts` (proposed)
- Create: `apex-flow/apps/worker/src/scheduler/dispatch-due.ts` (proposed)
- Create: `apex-flow/apps/worker/src/runtime/execute-run.ts` (proposed)
- Create: `apex-flow/apps/worker/src/runtime/execute-node.ts` (proposed)
- Create: `apex-flow/apps/worker/src/runtime/node-registry.ts` (proposed)
- Create: `apex-flow/apps/worker/test/lease-recovery.test.ts` (proposed)
- Create: `apex-flow/apps/worker/test/idempotency-retry.test.ts` (proposed)
- Create: `apex-flow/apps/worker/test/execution-state.test.ts` (proposed)

**Interfaces:**
- `claimNextJob(workerId): Promise<ClaimedJob | null>`
- `heartbeat(jobId, leaseToken): Promise<boolean>`
- `executeRun(runId, workflowRevisionId): Promise<RunOutcome>`
- `executeNode(node, input, context): Promise<NodeOutcome>`
- Node handlers register by immutable `type + version`.

- [ ] **Step 1: Add failing runtime tests**
  
  Cover atomic single claim under concurrent workers, lease expiry and reclaim, invalid lease token, worker crash between nodes, duplicate trigger idempotency, transient retry with max attempts/backoff, permanent failure no retry, timeout, cooperative cancellation, approval pause/resume, and immutable workflow revision pinning.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/worker/test`
  
  Expected: missing queue/runtime behavior is reported.

- [ ] **Step 3: Implement worker lifecycle**
  
  Claim jobs atomically with a lease token and expiry; heartbeat only while lease is owned; recover expired claims; persist node/run transitions; pin the exact workflow revision; execute registered node handlers; classify failures; retry only transient failures with exponential backoff and jitter; dead-letter exhausted jobs; honor timeouts and cooperative cancellation. Never keep execution state only in process memory.

- [ ] **Step 4: Implement scheduler**
  
  Query due schedules in bounded batches, create one idempotent run per trigger occurrence, record timezone-aware schedule metadata, and enqueue atomically. Repeated scheduler ticks must not create duplicate runs.

- [ ] **Step 5: Verify crash/recovery and integration**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/worker/test && npm run typecheck && npm run lint`
  
  Expected: recovery tests prove one active lease at a time, duplicate dispatch does not duplicate run creation, and terminal states are persisted.

- [ ] **Step 6: Commit**
  
  `git add apex-flow/apps/worker && git commit -m "feat(flow): add durable workflow execution"`

## Task 6: Workflow authoring web application

**Files:**
- Create: `apex-flow/apps/web/src/app/` (proposed)
- Create: `apex-flow/apps/web/src/features/workflows/` (proposed)
- Create: `apex-flow/apps/web/src/features/builder/visual/` (proposed)
- Create: `apex-flow/apps/web/src/features/builder/simple/` (proposed)
- Create: `apex-flow/apps/web/src/features/builder/hybrid/` (proposed)
- Create: `apex-flow/apps/web/src/features/runs/` (proposed)
- Create: `apex-flow/apps/web/src/i18n/` (proposed)
- Create: `apex-flow/apps/web/test/builder-roundtrip.test.ts` (proposed)
- Create: `apex-flow/apps/web/test/rtl-ltr.test.ts` (proposed)

**Interfaces:**
- Visual, Simple, and Hybrid builders consume and emit the shared `WorkflowDefinition`.
- API client uses only Task 3 API contracts; no direct privileged database writes.
- Builder save creates a new draft revision; publish/activate invokes server validation and authorization.

- [ ] **Step 1: Add failing UI/model tests**
  
  Test Visual-to-Simple-to-Hybrid round-trip without loss of node IDs/config/edges; invalid graph error display; unsaved change warning; new immutable revision on save; keyboard-accessible node controls; Arabic RTL and English LTR layout direction; narrow mobile viewport; and owner-only route protection.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/web/test`
  
  Expected: builder screens and shared workflow integration are absent.

- [ ] **Step 3: Implement application shell and core screens**
  
  Build Overview, workflow list, builder, run detail, approvals, module catalog, integrations, AI settings, schedules, audit/usage, and settings. Use the premium graphite/black base with gold, electric blue, and restrained red accents. Implement responsive layout and Arabic/English translation dictionaries.

- [ ] **Step 4: Implement all authoring modes against canonical contract**
  
  Visual mode edits graph nodes/edges; Simple mode edits the same definition through guided forms; Hybrid mode switches between both. Preserve stable node IDs and unknown-but-supported config fields. Do not create separate runtime serialization for any mode.

- [ ] **Step 5: Verify UI and build**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/web/test && npm run typecheck && npm run lint && npm run build`
  
  Expected: all builder round-trip, RTL/LTR, accessibility smoke, and production build checks pass.

- [ ] **Step 6: Commit**
  
  `git add apex-flow/apps/web && git commit -m "feat(flow): add multilingual workflow builder"`

## Task 7: Approvals, notifications, and run monitoring

**Files:**
- Create: `apex-flow/apps/api/src/routes/approvals.ts` (proposed; if not created in Task 3)
- Create: `apex-flow/apps/api/src/routes/notifications.ts` (proposed)
- Create: `apex-flow/apps/web/src/features/approvals/` (proposed)
- Create: `apex-flow/apps/web/src/features/runs/` (proposed)
- Create: `apex-flow/apps/worker/src/runtime/approval-gate.ts` (proposed)
- Create: `apex-flow/apps/worker/test/approval-binding.test.ts` (proposed)

**Interfaces:**
- `createApprovalRequest(runId, actionRef, revisionRef): Promise<ApprovalRequest>`
- `decideApproval(approvalId, decision, comment): Promise<ApprovalOutcome>`
- Approval decision binds to workflow revision, node/action reference, payload digest, and target integration/account.

- [ ] **Step 1: Add failing approval tests**
  
  Test approve/reject, stale revision, modified payload digest, wrong target account, duplicate decision, unauthorized actor, expired approval, and run resume exactly once.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/worker/test/approval-binding.test.ts`
  
  Expected: approval binding and resume behavior are missing.

- [ ] **Step 3: Implement approval gate**
  
  Pause the run before consequential action; persist the exact action payload digest and targets; require owner decision server-side; reject stale or changed payloads; record approver and timestamp; resume at most once. A rejected approval transitions to the defined safe terminal/paused state and does not call the external provider.

- [ ] **Step 4: Add run monitoring and notifications**
  
  Provide run/node timeline, retry history, redacted errors, correlation IDs, pending approvals, and notifications for approval required, success, failure, and budget thresholds. Notification delivery is best-effort and must not alter execution correctness.

- [ ] **Step 5: Verify focused and integration tests**
  
  Run: `cd apex-flow && npm test -- --runInBand apps/worker/test/approval-binding.test.ts apps/web/test && npm run typecheck`
  
  Expected: stale approval cannot resume an action and duplicate decisions cannot dispatch it twice.

- [ ] **Step 6: Commit**
  
  `git add apex-flow && git commit -m "feat(flow): add approval gates and run monitoring"`

## Task 8: AI provider adapters, router, and bounded AI nodes

**Files:**
- Create: `apex-flow/packages/ai/src/provider.ts` (proposed)
- Create: `apex-flow/packages/ai/src/router.ts` (proposed)
- Create: `apex-flow/packages/ai/src/budget.ts` (proposed)
- Create: `apex-flow/packages/ai/src/providers/openai.ts` (proposed)
- Create: `apex-flow/packages/ai/src/providers/gemini.ts` (proposed)
- Create: `apex-flow/packages/ai/src/providers/groq.ts` (proposed)
- Create: `apex-flow/packages/ai/test/router-budget.test.ts` (proposed)
- Create: `apex-flow/packages/ai/test/provider-fallback.test.ts` (proposed)

**Interfaces:**
- `AIProvider.generate(request): Promise<ProviderResult>`
- `routeAIRequest(task, policy): Promise<ProviderSelection>`
- `enforceBudget(runId, estimate): Promise<BudgetDecision>`
- Providers receive secrets only through server-side secret resolution.

- [ ] **Step 1: Add failing adapter/router tests**
  
  Test fixed model selection, automatic selection by capability, unavailable provider, invalid output schema, budget rejection, provider timeout, transient provider fallback, non-fallback policy error, and usage/cost recording without secret leakage.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/ai/test`
  
  Expected: provider adapters and routing policies are absent.

- [ ] **Step 3: Implement provider-neutral interface**
  
  Add server-side adapters for providers selected in Task 1. Normalize response metadata, enforce deadlines and output schemas, record model/usage/latency/cost estimates, and classify provider errors. Keep API keys in server-side secrets only.

- [ ] **Step 4: Implement router and budget controls**
  
  Support fixed model or automatic route per node; route by capability, configured quality, availability, latency, and cost ceiling. Do not silently downgrade data/privacy policy or quality constraints. Bound agent fan-out, tokens, wall-clock time, and total run spend.

- [ ] **Step 5: Verify**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/ai/test && npm run typecheck && npm run lint`
  
  Expected: routing respects hard budgets and fallback policy; no provider secret appears in test logs or serialized client responses.

- [ ] **Step 6: Commit**
  
  `git add apex-flow/packages/ai && git commit -m "feat(flow): add multi-provider AI routing"`

## Task 9: First safe integration module — webhooks and HTTP

**Files:**
- Create: `apex-flow/packages/modules/src/webhook/` (proposed)
- Create: `apex-flow/packages/modules/src/http/` (proposed)
- Create: `apex-flow/packages/modules/test/http-ssrf.test.ts` (proposed)
- Create: `apex-flow/packages/modules/test/webhook-signature.test.ts` (proposed)

**Interfaces:**
- Module registry exposes versioned node metadata and handlers to the worker.
- HTTP node accepts a validated URL/method/header/body reference and returns a bounded redacted response.
- Webhook trigger verifies signature, timestamp window, and replay/deduplication key before enqueue.

- [ ] **Step 1: Add failing integration security tests**
  
  Test private/loopback/link-local IP rejection, DNS rebinding defense, redirect to private IP rejection, unsupported schemes, oversized response, timeout, header secret redaction, invalid webhook signature, stale timestamp, replay, and duplicate delivery.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/modules/test`
  
  Expected: safe HTTP/webhook module behavior is absent.

- [ ] **Step 3: Implement safe HTTP node**
  
  Enforce allowlisted protocols, block private/internal/reserved address ranges after DNS resolution and at connection time, revalidate redirects, bound redirects/body/time, prevent credential forwarding across origins, and redact sensitive headers. Use the selected worker egress/network controls from Task 1.

- [ ] **Step 4: Implement webhook trigger**
  
  Verify provider HMAC/signature with constant-time comparison, timestamp tolerance, event ID deduplication, and bounded request bodies. Persist verified event identity before dispatch.

- [ ] **Step 5: Verify security tests**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/modules/test && npm run typecheck`
  
  Expected: all private-network and replay attempts are rejected without dispatch.

- [ ] **Step 6: Commit**
  
  `git add apex-flow/packages/modules && git commit -m "feat(flow): add secure webhook and HTTP nodes"`

## Task 10: First social module and publishing safety boundary

**Files:**
- Create: `apex-flow/packages/modules/src/social/` (proposed)
- Create: `apex-flow/apps/api/src/routes/social-connections.ts` (proposed)
- Create: `apex-flow/apps/worker/src/social/publish.ts` (proposed)
- Create: `apex-flow/packages/modules/test/social-capability.test.ts` (proposed)
- Create: `apex-flow/apps/worker/test/social-approval-idempotency.test.ts` (proposed)

**Interfaces:**
- Connector contract: `getCapabilities(account): Promise<PlatformCapabilities>`, `publish(approvedPayload, idempotencyKey): Promise<PublishResult>`, `reconcile(providerReference): Promise<PublishStatus>`.
- Connector state is one of `not_configured`, `pending_review`, `connected_read_only`, `connected_publish_ready`, `disabled`, or `error`.

- [ ] **Step 1: Add failing social safety tests**
  
  Test unsupported media/platform combination, missing scope, unreviewed app, wrong account type, stale approval, edited content after approval, duplicate publish dispatch, ambiguous timeout reconciliation, and unconfigured connector rejection.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/modules/test/social-capability.test.ts apps/worker/test/social-approval-idempotency.test.ts`
  
  Expected: social capability and approval/idempotency protections are absent.

- [ ] **Step 3: Implement content draft and capability layer**
  
  Add idea/draft creation, AI variants, immutable content versions, platform-specific capability checks, review queue, and scheduling metadata. Reuse existing Social AI concepts only after schema/API collision review; do not duplicate existing tables or bypass their approval invariants.

- [ ] **Step 4: Implement one official connector only**
  
  Select the first platform in Task 1 based on actual account access, official API eligibility, scopes, app review, and supported publishing operations. Implement OAuth state/nonce validation, server-only token storage, refresh/revocation, and read-only account metadata. Enable publishing only after test account/API review and verified capability.

- [ ] **Step 5: Implement safe publish worker**
  
  Recheck owner approval, exact content version, target account, connector capability, and idempotency immediately before publish. On ambiguous timeout, reconcile using provider reference/state before retrying. Record provider response reference and source timestamp. Never report success from a queued state alone.

- [ ] **Step 6: Verify and commit**
  
  Run: `cd apex-flow && npm test -- --runInBand packages/modules/test apps/worker/test/social-approval-idempotency.test.ts && npm run typecheck`
  
  Expected: unconfigured, unauthorized, unsupported, and stale-approved jobs never call the provider; duplicate dispatch is safe.

  `git add apex-flow && git commit -m "feat(flow): add first official social connector"`

## Task 11: Flutter Admin hybrid-control integration

**Files:**
- Modify: `flutter_admin/lib/main.dart` (observed; isolate additions and avoid unrelated rewrite)
- Create: `flutter_admin/lib/features/flow/flow_api.dart` (proposed)
- Create: `flutter_admin/lib/features/flow/flow_models.dart` (proposed)
- Create: `flutter_admin/lib/features/flow/flow_dashboard_screen.dart` (proposed)
- Create: `flutter_admin/lib/features/flow/flow_run_detail_screen.dart` (proposed)
- Create: `flutter_admin/test/flow_api_test.dart` (proposed)
- Create: `flutter_admin/test/flow_dashboard_test.dart` (proposed)

**Interfaces:**
- `FlowApi` wraps authenticated calls to the same Task 3 API; it does not use a service-role key or direct privileged table writes.
- Flutter provides workflow list, safe draft editing/guided steps, enable/disable, manual run, pause/cancel where supported, approval decisions, run history, and notifications.
- Advanced provider/credential/module/permission configuration remains web-only.

- [ ] **Step 1: Add failing Flutter tests**
  
  Test API authorization errors, loading/empty/error states, workflow list, run status rendering, disabled action states, approval decision refresh, and no secret fields in models/log output.

- [ ] **Step 2: Verify expected failures**
  
  Run: `cd flutter_admin && flutter test test/flow_api_test.dart test/flow_dashboard_test.dart`
  
  Expected: tests fail because Flow API/screens are not implemented.

- [ ] **Step 3: Implement typed API client and models**
  
  Reuse current Supabase session for authenticated API requests. Parse the shared response envelope, handle expired session/owner denial, map stable error codes, and redact server details. Do not store provider secrets in Flutter state or local preferences.

- [ ] **Step 4: Add Admin navigation and operational screens**
  
  Add an APEX FLOW section with list/status, safe manual run, pause/disable, approvals, run history, and monitoring. Use explicit confirmation for sensitive actions and show server-authoritative status after every mutation. Link advanced settings to the separate APEX FLOW web app only after its canonical URL is selected.

- [ ] **Step 5: Verify Flutter**
  
  Run: `cd flutter_admin && flutter pub get && flutter analyze && flutter test`
  
  Expected: zero analyzer issues and all existing plus new tests pass; existing Admin login, leads, inbox, payments, and lockdown flows remain intact.

- [ ] **Step 6: Commit**
  
  `git add flutter_admin && git commit -m "feat(admin): add APEX FLOW operational controls"`

## Task 12: Production hardening and release gate

**Files:**
- Create: `docs/runbooks/APEX_FLOW_OPERATIONS.md` (proposed)
- Create: `docs/runbooks/APEX_FLOW_INCIDENT_RESPONSE.md` (proposed)
- Create: `apex-flow/deploy/` (proposed; provider-specific)
- Modify: CI workflows only after their actual names and conventions are inspected.

**Interfaces:**
- Health endpoints expose liveness/readiness without secrets.
- Runbook documents deploy, rollback, queue drain, worker restart, credential rotation, emergency stop, backup restore, and incident handling.

- [ ] **Step 1: Add end-to-end and recovery tests**
  
  Test trigger-to-run-to-node completion, worker termination mid-run, scheduler outage/recovery, queue outage/recovery, credential revocation, provider rate limiting, emergency stop, restore from backup, and Arabic/English core journey.

- [ ] **Step 2: Verify pre-deploy test suite**
  
  Run: `cd apex-flow && npm test && npm run typecheck && npm run lint && npm run build`; then `cd flutter_admin && flutter analyze && flutter test`; then local Supabase migration reset and database tests.
  
  Expected: all commands exit zero and migration/security tests show no failures. Record exact outputs in the release checklist.

- [ ] **Step 3: Deploy to isolated staging**
  
  Provision separate staging Supabase project and worker resources. Apply reviewed migrations, configure staging-only secrets, deploy API/scheduler/worker, and run synthetic non-publishing workflows. Verify the worker continues when both clients are closed.

- [ ] **Step 4: Security and operational review**
  
  Verify RLS and owner negative tests, secret scanning, dependency audit, SSRF protections, webhook replay controls, logs redaction, rate limits, budget caps, backup/restore, alert delivery, and emergency stop. Review current provider docs and platform terms before enabling any connector.

- [ ] **Step 5: Production readiness decision**
  
  Publish a checklist with evidence for each acceptance criterion. If any criterion fails, keep the release in staging and document the blocker. Production deployment and live publishing require a separate explicit go/no-go decision.

- [ ] **Step 6: Commit**
  
  `git add docs/runbooks apex-flow/deploy .github && git commit -m "chore(flow): add production operations and release checks"`

## Unresolved externally observable decisions

These must be decided in Task 1 because they change implementation structure or operational behavior:
1. Worker host, region, queue technology, scheduler mechanism, and monthly budget ceiling.
2. Secret storage/encryption method and key rotation owner.
3. Exact Admin-vs-web permission matrix for deletion, activation, credential changes, and approval.
4. First official social connector and whether Release 1 includes publishing or draft/review only.
5. Notification channel(s), data/log retention, backup frequency, and restore objectives.
6. Workflow import/export requirement and public deployment domain.
7. Whether third-party modules are installable or all modules remain owner-maintained.

## Execution order

Tasks 1–5 establish the secure contract and durable runtime. Tasks 6–7 deliver the web workflow experience and approval operations. Task 8 adds AI. Tasks 9–10 add external integrations only after security gates. Task 11 connects Flutter Admin. Task 12 is the production release gate. Tasks 6 and 8 may proceed in parallel only after Tasks 2–3 stabilize their interfaces; database/runtime tasks must not be skipped.
