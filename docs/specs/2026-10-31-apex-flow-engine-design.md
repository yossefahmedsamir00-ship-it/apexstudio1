# APEX FLOW ENGINE — Product & Technical Design

**Status:** Draft for owner review — not approved for implementation  
**Date:** 2026-10-31  
**Repository:** `yossefahmedsamir00-ship-it/apexstudio1`  
**Branch:** `docs/apex-flow-engine-design`

## 1. Executive summary

APEX FLOW ENGINE is a private, owner-operated automation platform for APEX STUDIO. It is a standalone web application with its own interface and deployment, connected securely to the existing APEX STUDIO Admin app. It is not a public multi-customer SaaS in Release 1 and is not an n8n wrapper.

The engine must continue scheduled and background work when the browser, website, or Flutter Admin app is closed. The same workflow definition and execution engine power three authoring experiences: Visual, Simple, and Hybrid.

The design favors a modular central orchestrator with independently deployable workers. This balances reliability, future scale, operational complexity, and cost.

## 2. Product goals

1. Let the owner build, validate, run, schedule, pause, inspect, and maintain automations.
2. Support visual node-based authoring and a guided step-based builder without separate execution systems.
3. Provide reusable modules for social media, email, AI, databases, APIs/webhooks, schedules, conditions, approvals, and notifications.
4. Support multiple AI providers and model selection per task/node.
5. Provide durable execution, retries, idempotency, auditability, and actionable failure reporting.
6. Run in the cloud independently of client applications.
7. Offer Arabic and English with complete RTL/LTR behavior.
8. Keep operating cost visible and controllable.

## 3. Non-goals for Release 1

- Public self-service onboarding or customer-managed tenants.
- Replacing Supabase Auth or the existing APEX owner verification without a reviewed migration.
- Unofficial scraping, browser automation to bypass platform restrictions, or credential collection through platform passwords.
- Autonomous external publishing, spending, deletion, or other high-impact actions without explicit owner approval.
- Building every social connector at once.
- Microservices for every module before measured need.
- Treating a UI status, AI statement, or queued job as proof that an external action succeeded.

## 4. Users and authorization

### Release 1 user
One APEX STUDIO owner identity, verified server-side using the existing owner authorization pattern. The browser and Flutter app are presentation clients, never trusted authorization boundaries.

### Hybrid Admin control (approved direction)
- Flutter Admin: daily workflow creation/editing, enable/disable, run/pause where safe, approvals, notifications, run history, and operational monitoring.
- APEX FLOW web: full visual authoring, advanced configuration, provider setup, credentials, module configuration, model routing, limits, and diagnostics.
- Both clients call the same authenticated backend contracts.
- Sensitive operations always receive server-side authorization checks and audit events. Hiding a control in a client is not security.

Exact per-action permissions and which sensitive settings should be web-only remain implementation-time decisions to confirm in the permission matrix.

## 5. Core user journeys

1. Create a workflow using Visual, Simple, or Hybrid mode.
2. Add a trigger, processing nodes, conditions, optional approval, and action nodes.
3. Configure each node with validated inputs and credentials references (never raw secrets).
4. Validate graph structure, node schemas, permissions, and resource limits.
5. Save a versioned workflow draft.
6. Test with sample/sandbox data where supported.
7. Activate or schedule the workflow.
8. The scheduler enqueues a durable run; a worker claims it using a lease.
9. Each node execution records status, timings, safe outputs, and error classification.
10. Approval-gated actions pause until the owner decides.
11. The owner inspects results, retries eligible failures, or disables the workflow.

## 6. Authoring modes and canonical workflow model

All modes serialize to one versioned canonical workflow definition. The UI must not create separate runtime formats.

A workflow contains:
- Stable workflow ID and immutable revision number.
- Trigger definition.
- Nodes with stable IDs, module/type/version, configuration schema version, and credential references.
- Directed edges and optional branch labels.
- Execution policies: timeout, retry class, concurrency, and approval requirements.
- Locale/time-zone display preferences.
- Draft/active/paused/archived lifecycle.

The Visual Builder uses a node canvas (React Flow or an equivalent selected after a technical spike). Simple Builder creates the same nodes through guided forms. Hybrid Builder permits switching between both views without losing data.

Validation must reject missing required inputs, invalid edges, cycles where unsupported, unreachable nodes where disallowed, incompatible types, missing credentials, and unsafe action configurations. Workflow revisions are immutable once used by a run; editing creates a new revision.

## 7. Runtime architecture

### Logical components
- **APEX FLOW Web:** standalone responsive web application.
- **Admin Integration:** Flutter screens using the same API contracts.
- **API / Control Plane:** authenticated workflow, credential metadata, approval, run, and configuration endpoints.
- **Workflow Validator:** validates definitions before activation and before execution.
- **Scheduler:** finds due triggers and creates durable run records.
- **Queue:** stores dispatchable execution work with visibility/lease semantics.
- **Workers:** execute node handlers outside request/response lifetimes.
- **Node Registry:** versioned module/node definitions and capability metadata.
- **Integration Adapters:** provider-specific APIs and webhooks.
- **AI Router / Orchestrator:** selects providers/models and coordinates bounded AI tasks.
- **Observability:** run history, structured logs, metrics, alerts, and audit events.

### Recommended deployment shape
Start with a modular control-plane API and one independently deployable worker service, plus a durable queue/scheduler mechanism. Split workers by workload or provider only when measured throughput, isolation, or scaling requires it. Do not run long-lived jobs inside ordinary browser requests or assume a Supabase Edge Function is a permanent worker process.

Supabase Postgres/Auth remains the initial system of record and identity foundation. The worker is a separate cloud process. Firebase may be used for push notifications if the existing app integration benefits from it; it is not a second source of truth.

### Execution lifecycle
`queued -> claimed -> running -> waiting_approval | succeeded | failed | cancelled`

A lease expiry allows safe recovery of abandoned claims. Each run pins the exact workflow revision and node versions it started with.

## 8. Workflow execution guarantees

- Durable run and node state persisted before dispatch.
- At-least-once worker delivery is assumed; node handlers must be idempotent where possible.
- Unique idempotency keys for triggers and external side effects.
- Atomic claim/lease and bounded heartbeat.
- Retry only classified transient failures, with exponential backoff and jitter, maximum attempts, and dead-letter handling.
- Validation, permission, policy, and malformed-input failures are not blindly retried.
- Cancellation is cooperative and recorded; it cannot guarantee reversal of an already completed external action.
- Timeouts, concurrency caps, per-workflow limits, and global resource limits.
- Store safe structured outputs; redact tokens, secrets, personal data, and provider payloads where unnecessary.
- External success is recorded only after a provider response or verified reconciliation confirms it.

## 9. Module system

Modules register versioned nodes with:
- Unique module/node identifiers.
- Input and output schemas.
- Configuration UI metadata.
- Required capabilities and scopes.
- Secret references (not secret values).
- Runtime handler and timeout/retry policy.
- Test fixtures and conformance tests.
- Documentation and compatibility declaration.

Initial module families:
1. Triggers and schedules.
2. Conditions, filters, branching, and merge.
3. HTTP/API and webhooks.
4. AI generation, classification, extraction, and orchestration.
5. Social media.
6. Email.
7. Database operations.
8. Approval and notification.
9. Utilities and data transformation.

A module is unavailable until installed/enabled and its required credentials/capabilities are configured.

## 10. Social Media module

Target platforms are Instagram, Facebook, TikTok, YouTube, X, LinkedIn, Snapchat, Pinterest, and Threads. This is a target list, not a claim that every platform currently exposes equivalent publishing APIs.

Capabilities must be determined per official API, account type, app review, scopes, media type, region, and current platform terms. A connector state remains `not_configured` until credentials, scopes, required approvals, and a successful safe test are verified.

Initial rollout:
- Content idea intake and AI-assisted drafts.
- Platform-specific copy/format suggestions.
- Content versions and owner review.
- Calendar and planned scheduling records.
- Read-only analytics only where official APIs provide the data.
- Manual owner-triggered publishing only after a connector is verified.
- Scheduling/automatic publishing only after idempotency, reconciliation, and failure-path tests.

AI agents may research, draft, and recommend. They cannot approve or publish. Any content edit after approval invalidates the previous approval. No platform passwords, unofficial scraping, or API restriction bypass.

## 11. AI provider and agent architecture

Support a provider adapter interface rather than coupling workflows to one vendor. Candidate providers include OpenAI, Gemini, and Groq, subject to current API availability, terms, pricing, and user-supplied credentials.

The router considers:
- Task type and required capability.
- Output schema and context limits.
- Quality requirements.
- Latency and availability.
- Estimated cost and configured budget.
- Provider health and fallback policy.

Each AI node may choose a fixed model or use automatic routing. A workflow may use different models for different nodes. The orchestrator coordinates only bounded, auditable tasks; parallelizes independent tasks; and enforces deadlines, token/cost limits, and output validation.

Secrets stay server-side. Record provider/model, usage metadata, latency, and estimated cost without logging prompts or outputs containing sensitive information unless explicitly configured and protected. Provider fallback must not silently change required quality or data handling guarantees.

## 12. Data model — conceptual

The final schema must be reconciled with the existing database before migration. Proposed entities:
- `flow_workspaces` (single owner workspace initially)
- `flow_workflows`
- `flow_workflow_revisions`
- `flow_workflow_triggers`
- `flow_runs`
- `flow_node_runs`
- `flow_queue_jobs`
- `flow_approvals`
- `flow_credentials` (metadata only; encrypted secret material in a restricted private schema or dedicated secret store)
- `flow_modules`
- `flow_module_versions`
- `flow_schedules`
- `flow_webhook_endpoints`
- `flow_audit_events`
- `flow_usage_records`
- `flow_notifications`

Every owner/workspace-owned record must have consistent ownership keys and foreign keys. Add indexes for status, next-run time, workflow, and created-at access patterns. Define retention/cleanup policies before production.

## 13. API contract principles

Clients call authenticated server endpoints; they do not directly mutate runtime or credential tables. Proposed API groups:
- Workflows: list, create, update draft, validate, publish revision, activate, pause, archive.
- Runs: start test, start manual run, list, detail, cancel, retry eligible failure.
- Approvals: list pending, approve, reject.
- Modules: catalog, install/enable, configure, health.
- Credentials: create/update/delete metadata and secret through protected server flow; never return secret values.
- AI: provider configuration, model catalog, routing policy, usage.
- Admin: operational status, limits, audit events, emergency stop.

All mutations require strict schemas, authenticated owner verification, rate limits, audit events, safe error envelopes, and idempotency where applicable. Do not expose service-role keys, provider tokens, encryption keys, stack traces, or raw secret-bearing provider errors.

## 14. Security, privacy, and safety

- Reuse the existing Supabase Auth and owner-verification design only after verifying current deployed behavior.
- RLS on all exposed tables; deny client access to secret-bearing tables.
- Privileged credentials only in server-side secrets.
- Encrypt integration tokens at rest; support rotation and revocation.
- OAuth with exact registered redirects, state/nonce validation, least scopes, and token refresh controls.
- Explicit approval gates for publishing and consequential external actions.
- SSRF protection for HTTP nodes: block private/internal address ranges, restrict redirects and protocols, validate DNS/IP at connection time, and enforce egress policy.
- Resource ceilings for execution time, payload size, fan-out, concurrency, and AI spend.
- Audit authentication, configuration changes, approvals, activation, cancellation, and external actions.
- Emergency stop disables new dispatch and safely pauses eligible workflows.
- Data minimization, retention, export, and deletion policies.
- No arbitrary code execution node in Release 1. If later introduced, it requires a separate hardened sandbox design.

## 15. Localization and UI

- Arabic and English from first release.
- Full RTL/LTR support, including canvas controls, menus, forms, logs, and empty/error states.
- Persist language preference.
- Dark premium APEX visual identity: graphite/black, gold, electric blue, restrained fiery red.
- Responsive desktop and a dedicated mobile experience.
- Clear states for draft, active, paused, queued, running, waiting approval, succeeded, failed, and cancelled.
- Accessible keyboard navigation and readable contrast.

Primary screens:
1. Overview / Operations.
2. Workflow list.
3. Workflow Builder.
4. Run details / live activity.
5. Approvals inbox.
6. Module catalog.
7. Integrations and credentials.
8. AI providers and routing.
9. Schedules.
10. Audit, usage, and settings.

## 16. Reliability and observability

Track queue age/depth, run success/failure rates, node latency, retry volume, worker heartbeat, scheduler lag, provider errors, AI usage/cost, and webhook delivery health. Provide searchable run details with correlation IDs and safe redacted logs.

Alert on stuck queues, repeated failures, expired credentials, scheduler lag, budget thresholds, and worker downtime. Backups and restore drills are required before production.

## 17. Cost strategy

Use a cost-aware deployment selected after workload estimates and a provider/deployment comparison. Start with the smallest reliable always-on worker arrangement that satisfies 24/7 requirements. Avoid assuming a free tier supports permanent workers or production workloads. Apply per-workflow concurrency, execution quotas, AI budgets, and alerts. The system may recommend lower-cost models but must not silently violate configured quality or privacy policies.

## 18. Testing and acceptance criteria

Before production:
- Workflow schema and graph validation tests.
- Deterministic node executor unit tests.
- Worker crash/lease-expiry/recovery tests.
- Duplicate trigger and idempotency tests.
- Retry classification and dead-letter tests.
- Approval invalidation after edits.
- Owner authorization and negative-permission tests.
- RLS and cross-owner isolation tests.
- Secret redaction and credential rotation tests.
- SSRF and webhook signature/replay tests.
- AI router budget/fallback/schema tests.
- Arabic/English and RTL/LTR UI tests.
- End-to-end test from trigger to verified completion.
- Load and recovery tests for queue and workers.
- Build, static analysis, and deployment smoke tests.

Release 1 acceptance:
1. Owner can create and validate a workflow in all three authoring modes.
2. Each mode produces the same canonical workflow format.
3. Scheduled work executes in the cloud while all clients are closed.
4. Runs and node-level outcomes are durable and inspectable.
5. Duplicate deliveries do not cause duplicate external effects where idempotency is supported.
6. Approval is enforced server-side and bound to an exact workflow/content revision.
7. Credentials never reach browser/mobile clients or logs.
8. Admin and web clients use the same secure contracts.
9. Unconfigured integrations cannot execute.
10. Arabic/English and RTL/LTR are usable across core screens.

## 19. Phased delivery

### Phase 0 — Discovery and design approval
- Inspect repository, current Supabase schema, deployed functions, and Flutter navigation.
- Confirm permission matrix, hosting constraints, queue choice, and initial module scope.
- Review this design and record decisions.

### Phase 1 — Core foundation
- Typed workflow contract and validator.
- Owner-only API and audit model.
- Durable run/queue schema.
- Worker skeleton, scheduler, lease and recovery.
- Test harness and observability.

### Phase 2 — Builder and operations
- Workflow list and builder.
- Visual/Simple/Hybrid authoring mapped to canonical model.
- Run detail, logs, approvals, pause/cancel/retry.

### Phase 3 — AI module
- Provider adapters, model catalog, router, budgets.
- AI nodes and bounded orchestration.
- Evaluation and fallback tests.

### Phase 4 — First integrations
- Webhook and HTTP nodes with SSRF controls.
- Social content drafting and approvals.
- First official social connector only after access and API review.

### Phase 5 — Admin integration and cloud hardening
- Flutter Admin daily controls and monitoring.
- 24/7 worker deployment, alerts, backups, restore drill.
- Security review and production acceptance tests.

### Phase 6 — Expand modules
- Email, database, additional official social connectors, analytics, and future modules based on actual use.

## 20. Open decisions before implementation

1. Worker hosting provider/region and monthly budget ceiling.
2. Queue technology and scheduler mechanism.
3. Whether credential encryption uses a managed secret/KMS service or application-level envelope encryption.
4. Exact Admin-vs-web permission matrix for sensitive settings and workflow deletion.
5. First social platform connector, based on account access and official API eligibility.
6. Data/log retention period and backup/restore objectives.
7. Whether workflow import/export is required in the first release.
8. Required notification channels.
9. Whether any third-party module can be installed, or modules are owner-maintained only.
10. Production domain and deployment ownership.

## 21. Existing repository observations

The repository currently includes an APEX Flutter owner admin, Supabase Edge Functions, AI gateway foundations, and Social AI migrations/docs. Existing Social AI documentation describes n8n as an executor in that subsystem. This design intentionally proposes a separate native workflow engine and does not authorize modifying or merging the existing n8n draft PR.

The existing Flutter README describes owner verification through `apex-owner-bootstrap`, and the Social AI docs describe server-side owner checks, RLS, encrypted provider tokens, and approval-bound publishing. These are useful patterns to verify and reuse, not proof that all deployed configuration is currently correct.

## 22. Approval gate

This document is a design proposal only. Do not create production migrations, deploy workers, connect real social accounts, enable external publishing, or change existing production functions until:
1. The owner reviews and approves this design.
2. Open decisions that block the first implementation slice are resolved.
3. A separate implementation plan and test plan are reviewed.
