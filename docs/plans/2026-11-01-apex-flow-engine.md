# APEX FLOW ENGINE Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build APEX FLOW ENGINE as a dedicated Flutter application inside APEX STUDIO, starting with a safe owner workspace and a shared workflow-definition foundation that can grow into the durable execution engine.

**Architecture:** `flutter_flow/` is the dedicated Flutter presentation client. It owns workflow editing, monitoring, validation UX, and localization; it does not hold service-role credentials or execute privileged external side effects. Server-side execution, secrets, OAuth, approvals, and persistence remain behind authenticated APIs/Supabase contracts.

**Tech Stack:** Flutter/Dart, Material 3, Supabase Flutter for the future authenticated API boundary, GitHub Actions for Flutter analyze/test/build verification.

## Global Constraints

- APEX FLOW frontend is Flutter only.
- Arabic and English must be supported with RTL/LTR from the first release.
- Visual Builder, Simple Builder, and Hybrid Builder must share one workflow definition model.
- Manual, Semi-Automatic, and Automatic operating modes are required at the product level; external side effects default to explicit owner approval.
- Sequential, Parallel, and Conditional execution are required by the workflow model.
- Runs require durable checkpoints, pause/resume/stop semantics, idempotency, and reconciliation of uncertain external side effects before retry.
- APEX VAULT secrets never appear in the client or logs.
- Social integrations must use official APIs and preserve APEX SOCIAL AI approval/publishing boundaries.
- Test Run is required before activation of a new or materially changed workflow and must not perform production side effects.
- Do not modify, merge, or delete the existing n8n PR/branch without explicit permission.
- Preserve the existing `flutter_admin/` application; FLOW is initially isolated in `flutter_flow/`.

---

### Task 1: Flutter FLOW workspace foundation

**Files:**
- Create: `flutter_flow/pubspec.yaml`
- Create: `flutter_flow/analysis_options.yaml`
- Create: `flutter_flow/lib/main.dart`
- Create: `flutter_flow/lib/flow_models.dart`
- Create: `flutter_flow/lib/flow_workspace.dart`
- Create: `flutter_flow/test/flow_models_test.dart`
- Create: `flutter_flow/test/widget_test.dart`
- Create: `.github/workflows/flutter-flow.yml`

**Interfaces:**
- Consumes: no new backend contract; owner authentication remains an integration boundary for a later task.
- Produces: `FlowWorkflow`, `FlowNodeDefinition`, `FlowNodeInstance`, `FlowEdge`, `FlowRunSummary`, `FlowBuilderMode`, `FlowExecutionMode`, and a Flutter workspace that renders Visual/Simple/Hybrid builder modes.

- [ ] **Step 1: Add focused failing tests**

Test workflow serialization round-trips, rejects duplicate node IDs in validation, preserves execution mode, and renders the FLOW workspace with Visual/Simple/Hybrid navigation.

- [ ] **Step 2: Verify the relevant failure**

Run: `cd flutter_flow && flutter test`
Expected: tests fail because the FLOW model and workspace do not yet exist.

- [ ] **Step 3: Implement the minimum behavior**

Create immutable-ish Dart model objects with JSON serialization, a pure validator, a dark premium Material 3 theme, Arabic/English locale switching with RTL/LTR direction, and a responsive workspace containing Overview, Builder, Runs, Templates, Nodes, Vault, Integrations, and Settings destinations. The initial canvas is editor-only: it manipulates an in-memory workflow and never performs external side effects.

- [ ] **Step 4: Verify the focused pass**

Run: `cd flutter_flow && flutter test`
Expected: all FLOW unit/widget tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd flutter_flow && flutter analyze`
Expected: analyzer reports no errors.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add flutter_flow .github/workflows/flutter-flow.yml
git commit -m "feat: add APEX FLOW Flutter workspace foundation"
```

### Task 2: Workflow authoring and Test Run contract

**Files:**
- Create: `flutter_flow/lib/flow_validation.dart`
- Create: `flutter_flow/lib/flow_test_run.dart`
- Create: `flutter_flow/test/flow_validation_test.dart`
- Create: `flutter_flow/test/flow_test_run_test.dart`

**Interfaces:**
- Consumes: `FlowWorkflow` from `flow_models.dart`.
- Produces: validation results, deterministic synthetic Test Run results, and activation-gate status.

- [ ] **Step 1: Add failing validation/Test Run tests**

Cover missing trigger, disconnected required node ports, duplicate IDs, unsupported node type, and a valid workflow. Test Run must mark external side effects as mocked/blocked and must never return a production execution status.

- [ ] **Step 2: Verify failure**

Run: `cd flutter_flow && flutter test test/flow_validation_test.dart test/flow_test_run_test.dart`
Expected: failures for missing validation/Test Run behavior.

- [ ] **Step 3: Implement validation and synthetic execution**

Return structured errors/warnings, calculate an activation gate, and execute only deterministic local fixtures. External integrations are represented as mocked steps with safe output summaries.

- [ ] **Step 4: Verify pass**

Run: `cd flutter_flow && flutter test test/flow_validation_test.dart test/flow_test_run_test.dart`
Expected: all focused tests pass.

- [ ] **Step 5: Run integration check**

Run: `cd flutter_flow && flutter analyze`
Expected: no analyzer errors.

- [ ] **Step 6: Commit**

```bash
git add flutter_flow/lib/flow_validation.dart flutter_flow/lib/flow_test_run.dart flutter_flow/test
git commit -m "feat: add FLOW validation and safe test-run gate"
```

### Task 3: Authenticated backend boundary and durable run contracts

**Files:**
- Create: `flutter_flow/lib/flow_api.dart`
- Create: `flutter_flow/lib/flow_run_models.dart`
- Create: `supabase/migrations/<generated-flow-foundation-migration>.sql` after database reconciliation
- Create/modify: `supabase/functions/<flow-function>/` only after existing Edge Function contracts are audited
- Create: `flutter_flow/test/flow_run_models_test.dart`

**Interfaces:**
- Consumes: authenticated Supabase session and existing APEX SOCIAL AI server contracts.
- Produces: owner-authenticated workflow CRUD/version/test-run/run-control API boundary and durable run state contracts.

- [ ] **Step 1: Add failing contract tests**

Cover owner authorization, exact workflow-version binding, idempotency keys, pause/resume/stop commands, and rejection of client-supplied tenant/owner identity.

- [ ] **Step 2: Verify failure**

Run the focused Flutter contract tests and the server-side test command selected after repository/schema reconciliation; expected failure is missing FLOW contract implementation.

- [ ] **Step 3: Implement the authenticated boundary**

Use the current Supabase Auth session, server-side owner verification, RLS/service-role boundaries, and explicit API contracts. Do not expose service-role credentials or provider tokens. Create migrations only after inspecting the existing schema and generating the migration through the supported Supabase workflow.

- [ ] **Step 4: Verify pass**

Run focused Flutter tests plus the relevant server/database verification; expected all authorization and state-transition tests pass.

- [ ] **Step 5: Run integration checks**

Run the project-specific Flutter and Supabase checks selected from the audited repository tooling.

- [ ] **Step 6: Commit**

```bash
git add flutter_flow supabase
git commit -m "feat: add authenticated FLOW run boundary"
```

### Task 4: Durable execution, monitoring, Vault, and Social AI adapters

**Files:**
- Create: `flutter_flow/lib/flow_monitor.dart`
- Create: `flutter_flow/lib/flow_vault.dart`
- Create: `flutter_flow/lib/flow_integrations.dart`
- Create: server worker/queue/scheduler files at paths selected by the audited backend hosting setup
- Create: focused unit/integration tests for worker leases, checkpoints, idempotency, approval gates, and adapter contracts

**Interfaces:**
- Consumes: authenticated FLOW run contracts and APEX SOCIAL AI contracts.
- Produces: durable worker execution, live monitoring, Vault references, official social adapters, and safe approval gates.

- [ ] **Step 1: Add failing worker/adapter tests**

Cover retry without duplicate side effects, lease expiry, checkpoint resume, cancellation, approval waiting, credential non-disclosure, and provider capability mismatch.

- [ ] **Step 2: Verify failure**

Run the focused worker/integration tests; expected failure is absence of durable execution implementation.

- [ ] **Step 3: Implement**

Use durable queue jobs and independent workers, persist node checkpoints/events, reconcile uncertain side effects before retry, keep secrets server-side, and route social publishing through APEX SOCIAL AI approval/publishing contracts.

- [ ] **Step 4: Verify pass**

Run worker, adapter, and Flutter monitor tests; expected all pass.

- [ ] **Step 5: Run full integration checks**

Run repository CI-equivalent Flutter tests/analyze/build and the backend verification suite.

- [ ] **Step 6: Commit**

```bash
git add flutter_flow supabase .github
 git commit -m "feat: add durable FLOW execution and integrations"
```

## Unresolved externally observable decisions

- The hosting provider/topology for independent FLOW workers and scheduler is not yet fixed; this changes deployment files but not the Flutter contract.
- The durable queue implementation is not yet fixed; it must be chosen after the current Supabase/backend deployment capabilities are audited.
- Secret encryption/KMS and rotation mechanism must be selected before APEX VAULT production credentials are stored.
- Custom Node sandbox technology must be selected before unrestricted custom execution is exposed.
- Log retention and initial provider OAuth rollout order remain deployment/product decisions.
