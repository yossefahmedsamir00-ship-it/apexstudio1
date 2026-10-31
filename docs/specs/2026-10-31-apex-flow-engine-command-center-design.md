# APEX FLOW ENGINE — Command Center Design

**Status:** Draft for owner review — design approved in conversation; written specification awaiting review  
**Date:** 2026-10-31  
**Repository:** `yossefahmedsamir00-ship-it/apexstudio1`  
**Branch:** `docs/apex-flow-engine-design`

## 1. Purpose and scope

APEX FLOW ENGINE is a private, owner-operated command center for APEX STUDIO. The owner submits requests through a chat interface; the system turns them into trackable operations, video-scene work, approval tasks, publishing drafts, and financial records.

Release 1 focuses on a reliable command center and shared data model for the web interface and existing Flutter Admin. It does not promise fully autonomous AI video generation, social publishing, or always-on execution until the required services, credentials, permissions, and worker infrastructure are verified.

## 2. User experience

### Main areas

1. **AI Chat**
   - Accept owner requests in Arabic or English.
   - Preserve the original request and create a structured operation proposal.
   - Show planned steps, required inputs, estimated resource use when available, and any blockers.
   - Never claim that a task ran merely because a plan was generated.

2. **Operations**
   - List operations with status, timestamps, progress, related request, and safe error details.
   - Support inspection, cancellation where safe, and retry only when eligible.
   - Keep a durable activity timeline.

3. **Video Studio**
   - Organize a project into scenes.
   - Track each scene's brief, script, assets, generation/provider status, review state, and revisions.
   - In the initial release, scene planning and draft management are supported; actual video generation requires a verified provider or a supported local workflow.

4. **Approvals**
   - Present exact content/revision and target for owner review.
   - Approval is invalidated when approved content or target changes.
   - Publishing and other consequential external actions require server-side approval.

5. **Publishing**
   - Store platform-specific drafts and planned publishing records.
   - Use official platform APIs only after account eligibility, scopes, app permissions, and connector health are verified.
   - Do not scrape platforms, collect platform passwords, or bypass API restrictions.
   - Record success only after a provider response or reconciliation verifies it.

6. **Revenue Dashboard**
   - Show recorded revenue, expenses, and net profit from actual persisted records.
   - Distinguish confirmed, pending, refunded, and estimated amounts.
   - Never generate synthetic revenue or infer that a payment succeeded without trusted payment evidence.
   - Currency, time range, and data source must be visible.

7. **Flutter Admin Sync**
   - Web and Flutter Admin use the same authenticated backend contracts and source-of-truth records.
   - Both clients display consistent operation, scene, approval, publishing, and finance states.
   - Client-side UI restrictions are not authorization; the server enforces owner permissions.

## 3. Core workflow

1. Owner submits a request in AI Chat.
2. The backend stores the request and creates a proposed operation plan.
3. The owner reviews any missing inputs, risks, costs, and proposed external effects.
4. The system creates operation and scene records from the approved plan.
5. Supported internal steps execute and persist their status and results.
6. External actions pause for explicit owner approval.
7. Results, failures, and verified financial events appear in the web and Flutter Admin views.

A plan, preview, or queued job is not evidence of execution. A provider response or trusted reconciliation is required to mark an external effect successful.

## 4. Architecture

- **Web UI:** current APEX Flow Engine standalone frontend, extended into the command center.
- **Flutter Admin:** companion owner interface; no separate business logic or independent source of truth.
- **Supabase Auth/Postgres:** existing project as the initial identity and persistence foundation, subject to repository and deployed-configuration verification before migrations.
- **Server API / Edge Functions:** authenticated operations for request intake, planning, operations, scenes, approvals, and dashboard queries.
- **Execution worker:** separate worker for durable/background work when required. Static hosting and request-scoped Edge Functions must not be represented as permanent workers.
- **Provider adapters:** isolated integrations for AI, video generation, social publishing, and payment evidence.
- **Audit and observability:** operation timeline, safe logs, owner actions, provider results, and error classification.

Keep the first implementation modular rather than prematurely splitting every subsystem into a separate service. The exact queue and worker hosting choice is an implementation decision and must be checked against the zero-budget constraint.

## 5. Data concepts

Proposed logical records (final names and schema must be reconciled with the existing Supabase database before migrations):

- `flow_requests`: original owner prompt, locale, status, and timestamps.
- `flow_operations`: operation plan, lifecycle, progress, and parent request.
- `flow_operation_steps`: individual steps, dependencies, attempts, outputs, and errors.
- `flow_video_projects` and `flow_scenes`: video project and scene-level planning/review/generation state.
- `flow_assets`: metadata and storage references for scene assets.
- `flow_approvals`: exact action/content revision, target, decision, owner, and timestamps.
- `flow_publishing_drafts`: platform-specific content revisions and publishing state.
- `flow_financial_entries`: verified revenue, expenses, refunds, currency, source, and evidence reference.
- `flow_audit_events`: security-sensitive and consequential owner/system actions.
- `flow_provider_connections`: non-secret provider metadata and health state.

All exposed records require owner-scoped authorization and appropriate Row Level Security. Secret values must never be returned to either client.

## 6. Status and error handling

Use explicit states rather than ambiguous booleans. At minimum:

- Operations: `draft`, `queued`, `running`, `waiting_approval`, `succeeded`, `failed`, `cancelled`.
- Scenes: `planned`, `drafting`, `ready_for_review`, `approved`, `generating`, `completed`, `failed`.
- Publishing: `draft`, `awaiting_approval`, `approved`, `scheduled`, `publishing`, `published`, `failed`, `not_configured`.

Persist safe error codes, user-readable explanations, correlation IDs, and retryability. Retry transient failures with bounded attempts and idempotency controls. Do not blindly retry permission, validation, or policy failures.

## 7. Security and approvals

- Verify the owner on the server for every protected operation.
- Apply RLS to exposed tables and keep privileged credentials server-side.
- Never embed service-role keys, provider secrets, or encryption keys in web or Flutter clients.
- Use official OAuth/API flows and least-privilege scopes for integrations.
- Bind approval to the exact content revision, action, and destination.
- Any material edit after approval requires a new approval.
- Audit sign-in, configuration changes, approvals, operation cancellation/retry, and external effects.
- Apply rate limits, payload limits, timeouts, and safe error redaction.
- No public customer onboarding in this initial private-owner release.

## 8. Zero-budget operating constraints

The project must not provision paid subscriptions, APIs, hosting, workers, or other billable services without explicit owner approval. The existing Supabase Free project may be used only within its actual limits.

A truly continuous background worker cannot be promised from static hosting or request-scoped functions. If no reliable free always-on worker is available, Release 1 must use a clearly labeled manual/foreground execution mode and report that limitation honestly.

AI features require an already-available key or a genuinely available local/open-source alternative. Video generation and social publishing remain unavailable until a real provider/API and its permissions are configured. The UI must clearly show `not_configured` rather than simulate success.

## 9. Delivery sequence

1. Inspect current repository, Supabase schema/functions, and Flutter Admin navigation; identify reusable patterns and conflicts.
2. Confirm the minimal data model, owner authorization, and web/Flutter API contracts.
3. Implement authenticated request intake, operation records, status timeline, and safe manual execution.
4. Add scene/project planning and approval lifecycle.
5. Add Flutter Admin views using the same backend contracts.
6. Add verified provider integrations one at a time, beginning with draft/review flows.
7. Add verified financial event ingestion and reporting.
8. Add durable worker/scheduler only after a feasible hosting option and cost ceiling are approved.

Each phase requires build/test evidence and must not be described as complete before verification.

## 10. Testing and acceptance

- Owner-only authorization and negative-access tests.
- RLS isolation tests for every exposed table.
- Request-to-operation persistence and status transition tests.
- Scene revision and approval invalidation tests.
- Duplicate request/step delivery and idempotency tests.
- Retry classification, timeout, cancellation, and recovery tests.
- Secret redaction tests for logs and client responses.
- Flutter/web contract consistency tests.
- Financial reconciliation tests, including refunds and currency handling.
- Arabic/English and RTL/LTR UI tests.
- Build, static checks, integration tests, and deployment smoke tests.

Initial acceptance means the owner can submit a request, inspect its proposed plan, track persisted operations and scenes, approve/reject gated actions, and see the same truthful state in web and Flutter Admin. It does not imply AI video generation, live social publishing, 24/7 scheduling, or payment processing unless those integrations are separately implemented and verified.

## 11. Explicit exclusions and protected work

- Do not modify, close, or merge existing PR #11 as part of this work.
- Do not change the production `main` branch or deploy production services without separate explicit approval.
- Do not overwrite existing Supabase functions, schema, or secrets before inspecting their current state and preparing a migration/review plan.
- Do not claim the existing frontend prototype is connected to Supabase or Flutter until integration is implemented and tested.

## 12. Open decisions for implementation planning

1. Which operation types should be enabled first beyond request intake and scene planning?
2. What is the maximum acceptable monthly cost if a free always-on worker is not feasible? Until explicitly approved, the limit remains zero.
3. Which social platform, if any, should be the first official connector?
4. Which trusted source will provide financial entries (manual owner entry initially, payment provider, or another verified source)?
5. Which screens/actions should be available in Flutter Admin versus web-only?

These decisions can be resolved in small increments before the relevant implementation phase; they must not be guessed or represented as already configured.
