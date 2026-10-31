# APEX FLOW ENGINE Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing safe APEX FLOW playground into a truthful owner-only command center where requests become persisted operations and scenes, with approvals, financial records, and shared state available to the web and Flutter Admin without inventing external execution.

**Architecture:** Keep the existing Vite frontend as the web entry point and introduce a typed client/service boundary rather than embedding business rules in the HTML playground. Use the existing Supabase project as the initial source of truth, with authenticated server-side checks, RLS, and Edge Functions for request-scoped control-plane operations; reserve durable/background execution for a separately verified worker mechanism. Flutter Admin consumes the same backend contracts and never becomes a second source of truth.

**Tech Stack:** React 18, TypeScript 5.9, Vite 8, Vitest 5/jsdom, Supabase JS 2.118, Supabase Postgres/Auth/Edge Functions, existing Flutter Admin with `supabase_flutter`.

## Global Constraints

- Private owner-operated Release 1; no public multi-tenant onboarding.
- Existing Supabase Free project is the initial persistence/auth foundation; reconcile the current schema/functions before migrations.
- No paid subscriptions, APIs, hosting, workers, or other billable services without explicit owner approval; current approved recurring budget is zero.
- Never simulate AI generation, external publishing, payment success, revenue, or 24/7 execution.
- External actions require server-side owner authorization and approval bound to the exact content/revision/target.
- Secrets stay server-side and never enter browser/mobile responses or logs.
- RLS must protect all exposed owner data.
- Do not scrape platforms, collect platform passwords, or bypass provider/API restrictions.
- Do not modify, close, or merge existing PR #11; do not change production `main` or deploy production services as part of this plan without separate explicit approval.
- Preserve the existing safe dry-run behavior until real backend integration replaces a specific local behavior.
- Arabic/English and RTL/LTR are required for core user-facing states.

---

### Task 1: Establish the typed Flow Engine domain and Supabase persistence contract

**Files:**
- Create: `apex/src/flow-engine/domain.ts`
- Create: `apex/src/flow-engine/domain.test.ts`
- Create: `apex/src/flow-engine/api.ts`
- Create: `apex/src/flow-engine/api.test.ts`
- Create: `supabase/migrations/<timestamp>_flow_engine_core.sql` (proposed; exact migration path must follow the repository's existing Supabase migration convention after inspection)
- Modify: `apex/vite.config.ts` only if the new TypeScript entry requires a separate build entry
- Modify: `apex/flow-engine.html` only to mount the new React/client entry; preserve the current dry-run UI until the new path is verified

**Interfaces:**
- Consumes: current Vite multi-entry configuration and `flow-engine.html` safe preview behavior. The repository already exposes React, Supabase JS, and Vitest scripts in `apex/package.json`. fileciteturn70file0
- Produces: `FlowRequest`, `FlowOperation`, `FlowOperationStep`, `FlowVideoProject`, `FlowScene`, `FlowApproval`, `FlowPublishingDraft`, `FlowFinancialEntry`, and `FlowAuditEvent` types; `FlowStatus` unions; typed API request/response envelopes; Supabase table contracts used by Tasks 2–4.

- [ ] **Step 1: Add the focused failing tests**

Test that domain constructors/validators accept a valid owner request and canonical operation with explicit lifecycle states; reject an operation step referencing a missing operation, reject an approval whose revision/target does not match the action it approves, and reject a financial entry with an unsupported lifecycle state. Test that API envelopes distinguish `success`, `validation_error`, `unauthorized`, `not_configured`, and `provider_error` without exposing secret-bearing fields.

- [ ] **Step 2: Verify the relevant failure**

Run: `cd apex && npm test -- --run src/flow-engine/domain.test.ts src/flow-engine/api.test.ts`
Expected: the new tests fail because the domain/API modules and schemas do not yet exist.

- [ ] **Step 3: Implement the minimum behavior**

Define the canonical records and status unions exactly once. Add a typed result envelope carrying a stable `code`, user-safe `message`, optional `correlationId`, and typed `data`; never serialize provider tokens, service-role keys, or raw provider error payloads. Create the core Supabase tables for requests, operations, operation steps, video projects/scenes, approvals, publishing drafts, financial entries, and audit events with owner identity keys, foreign keys, status indexes, created-at indexes, and RLS policies that deny cross-owner access. Keep secrets out of these client-facing tables. Reconcile table names/columns against the existing database before committing the migration; if a conflicting deployed object exists, stop and prepare a compatibility migration instead of overwriting it.

- [ ] **Step 4: Verify the focused pass**

Run: `cd apex && npm test -- --run src/flow-engine/domain.test.ts src/flow-engine/api.test.ts`
Expected: all focused domain/API tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd apex && npm run build`
Expected: TypeScript and Vite build succeed with the existing multi-page entries intact.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add apex/src/flow-engine apex/flow-engine.html apex/vite.config.ts supabase/migrations
git commit -m "feat: add flow engine domain and persistence contract"
```

---

### Task 2: Implement authenticated request intake, operations, scenes, approvals, and finance control-plane APIs

**Files:**
- Create: `supabase/functions/flow-engine-request/index.ts` (proposed)
- Create: `supabase/functions/flow-engine-operation/index.ts` (proposed)
- Create: `supabase/functions/flow-engine-approval/index.ts` (proposed)
- Create: `supabase/functions/flow-engine-finance/index.ts` (proposed)
- Create: `supabase/functions/_shared/flow-engine-auth.ts` (proposed)
- Create: `supabase/functions/_shared/flow-engine-contracts.ts` (proposed)
- Create: `supabase/functions/_shared/flow-engine-audit.ts` (proposed)
- Create: `apex/src/flow-engine/client.ts`
- Create: `apex/src/flow-engine/client.test.ts`

**Interfaces:**
- Consumes: Task 1 domain types/tables and the existing owner-auth pattern used by Flutter Admin, where the app verifies the current Supabase session through the `apex-owner-bootstrap` Edge Function. fileciteturn73file0
- Produces: authenticated operations `createRequest`, `getRequest`, `listOperations`, `getOperation`, `createScene`, `updateScene`, `requestApproval`, `approve`, `reject`, `recordFinancialEntry`, and read-only dashboard queries. All mutations return the typed result envelope from Task 1.

- [ ] **Step 1: Add the focused failing tests**

Test unauthenticated requests return `unauthorized`; a valid owner can create a request and receive a persisted request ID; a request creates an operation proposal without claiming execution; an approval is rejected when the content revision or destination differs from the approval payload; rejected approvals do not authorize publishing; financial entries are persisted with their declared source/status and are visible only to the owner; audit events are written for approval and financial mutations.

- [ ] **Step 2: Verify the relevant failure**

Run the Edge Function test command selected by the repository's existing Supabase test convention after inspecting current function tooling; expected result is failing tests for the missing functions/contracts.

- [ ] **Step 3: Implement the minimum behavior**

Centralize owner verification in `_shared/flow-engine-auth.ts` and fail closed when the session is absent or the owner bootstrap check is not verified. Keep client calls request-scoped. `createRequest` stores the exact owner prompt and creates a proposed operation with status `draft`; it must not invoke an external provider. Operation/scene mutations enforce ownership and valid status transitions. Approval records the exact action, content revision, and target; any later content/target mutation invalidates the approval. Finance records require an explicit source and status and never infer payment success. Every consequential mutation writes an audit event. Return safe errors and correlation IDs.

- [ ] **Step 4: Verify the focused pass**

Run the repository's focused Edge Function test suite and `cd apex && npm test -- --run src/flow-engine/client.test.ts`.
Expected: authorization, persistence, revision-binding, audit, and safe-error tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd apex && npm run build`
Expected: the web client compiles with the typed Flow Engine client and no secrets are embedded in the bundle.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add supabase/functions apex/src/flow-engine
 git commit -m "feat: add flow engine control plane APIs"
```

---

### Task 3: Replace the local-only command center path with real request/operations/scenes/approvals/finance views

**Files:**
- Create: `apex/src/flow-engine/App.tsx`
- Create: `apex/src/flow-engine/components/ChatPanel.tsx`
- Create: `apex/src/flow-engine/components/OperationsPanel.tsx`
- Create: `apex/src/flow-engine/components/VideoStudioPanel.tsx`
- Create: `apex/src/flow-engine/components/ApprovalsPanel.tsx`
- Create: `apex/src/flow-engine/components/RevenuePanel.tsx`
- Create: `apex/src/flow-engine/components/StatusBadge.tsx`
- Create: `apex/src/flow-engine/i18n.ts`
- Create: `apex/src/flow-engine/App.test.tsx`
- Modify: `apex/flow-engine.html` to mount the React command center

**Interfaces:**
- Consumes: Task 2 `FlowEngineClient` methods and Task 1 status/domain types.
- Produces: responsive owner command center with Chat, Operations, Video Studio, Approvals, Publishing status, and Revenue views; all visible states come from backend records or explicit `not_configured` states.

- [ ] **Step 1: Add the focused failing tests**

Test that submitting chat text creates a request and renders the returned operation ID/status; operations render `queued`, `running`, `waiting_approval`, `succeeded`, `failed`, and `cancelled` distinctly; a scene revision shows the current revision and invalidates a previous approval; Revenue shows confirmed/pending/refunded/estimated records without fabricating totals; unavailable video/publishing providers render `not_configured`; Arabic switches to RTL and English to LTR.

- [ ] **Step 2: Verify the relevant failure**

Run: `cd apex && npm test -- --run src/flow-engine/App.test.tsx`
Expected: tests fail because the React command-center components are not yet present.

- [ ] **Step 3: Implement the minimum behavior**

Build the UI around the existing dark APEX visual language rather than extending the monolithic HTML script. Chat submits exact owner text to the control-plane API and shows a truthful proposal/result. Operations shows durable activity and safe error messages. Video Studio manages project/scene planning and revisions; it does not fake generation. Approvals display exact content revision and target and call the server approval endpoint. Revenue displays persisted financial entries and computes only from their explicit status/source rules; if no verified records exist, show that state instead of `$0` as if it were measured revenue. Keep publishing UI draft/review-first and show `not_configured` until an official connector is verified. Implement Arabic/English and RTL/LTR from one localization map.

- [ ] **Step 4: Verify the focused pass**

Run: `cd apex && npm test -- --run src/flow-engine/App.test.tsx`
Expected: all command-center interaction and localization tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd apex && npm run build`
Expected: all Vite entries build, including `flow-engine.html`; the current Vite config already lists `flowEngine` as an entry. fileciteturn71file0

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add apex/flow-engine.html apex/src/flow-engine
 git commit -m "feat: build flow engine command center"
```

---

### Task 4: Add Flutter Admin synchronization and verified execution boundaries

**Files:**
- Modify: `flutter_admin/lib/main.dart` only at the navigation/service boundary; preserve existing owner-authentication behavior.
- Create: `flutter_admin/lib/features/flow_engine/flow_engine_api.dart` (proposed)
- Create: `flutter_admin/lib/features/flow_engine/flow_engine_models.dart` (proposed)
- Create: `flutter_admin/lib/features/flow_engine/flow_engine_screen.dart` (proposed)
- Create: `flutter_admin/test/flow_engine_models_test.dart` (proposed)
- Create: `flutter_admin/test/flow_engine_screen_test.dart` (proposed)
- Create: execution worker/scheduler files only after a hosting mechanism is explicitly selected and verified against the zero-budget constraint; no worker is claimed by this task until that boundary is resolved.

**Interfaces:**
- Consumes: Task 2 authenticated control-plane endpoints and Task 1 domain/status contracts. Existing Flutter Admin already initializes Supabase and gates the private shell through `apex-owner-bootstrap`; this task reuses that authenticated session rather than creating a second auth system. fileciteturn73file0
- Produces: Flutter screens for request intake, operations, scenes, approvals, and revenue using the same backend state as web; optional execution status only when a verified worker/provider reports it.

- [ ] **Step 1: Add the focused failing tests**

Test that the Flutter API model decodes every core status and safely ignores unknown future fields; the screen can load the same operation ID/status returned by the web API; approval actions call the same server endpoint; unauthorized responses close the feature rather than exposing private data; `not_configured` provider states are shown without enabling fake execution.

- [ ] **Step 2: Verify the relevant failure**

Run: `cd flutter_admin && flutter test test/flow_engine_models_test.dart test/flow_engine_screen_test.dart`
Expected: tests fail because the Flow Engine feature models/screens do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Add a thin Flutter API adapter using the authenticated Supabase client/Edge Function path. Do not duplicate business logic from the web. Add navigation to the Flow Engine area after the existing owner gate. Display the same operation/scene/approval/finance records and expose only safe owner actions. Keep provider and worker status explicit. If a worker is not configured, the Flutter UI must show manual/foreground or `not_configured` execution status rather than claiming background execution.

- [ ] **Step 4: Verify the focused pass**

Run: `cd flutter_admin && flutter test test/flow_engine_models_test.dart test/flow_engine_screen_test.dart`
Expected: all model, authorization, and screen-state tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd flutter_admin && flutter test`
Expected: the complete existing Flutter test suite passes with the new feature enabled; existing owner-auth tests remain green.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add flutter_admin/lib/main.dart flutter_admin/lib/features/flow_engine flutter_admin/test/flow_engine_models_test.dart flutter_admin/test/flow_engine_screen_test.dart
git commit -m "feat: sync flow engine with flutter admin"
```

## Unresolved Product Decisions

1. **First operation types:** request intake, operation tracking, and scene planning are fixed for the first slice; any additional automated operation types require selection before their provider side effects are implemented.
2. **Worker hosting:** no always-on worker is selected while the approved recurring budget is zero. The implementation must not promise 24/7 execution until a feasible free mechanism is verified or a paid budget is explicitly approved.
3. **First social connector:** no connector is selected yet; the first one must be chosen from platforms for which the owner has eligible accounts and official API access.
4. **Financial source:** manual owner-entered verified records are the initial safe source unless a payment provider is explicitly selected and its integration is verified.
5. **Flutter vs web permissions:** daily operations/approvals/monitoring belong in Flutter; sensitive provider/credential configuration remains web-only unless the owner explicitly changes this boundary.
6. **Schema conflicts:** if existing Supabase objects overlap the proposed `flow_*` tables, implementation must preserve deployed behavior and use a compatibility migration rather than overwrite an existing table/function.
