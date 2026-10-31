# APEX FLOW ENGINE — Zero-Budget Release and Workflow Contract

**Status:** Proposed implementation baseline  
**Budget ceiling:** EGP 0 / USD 0 recurring spend  
**Scope:** Private, owner-operated release; no public tenant onboarding  
**Branch:** `docs/apex-flow-engine-design`

## 1. Non-negotiable budget rule

The first release must not require a paid subscription, paid hosting, a billing account, or a payment card. Do not enable a paid plan, provision paid compute, create a paid project, or consume a paid API without the owner's explicit approval.

A free-tier quota is not a promise of unlimited availability. The UI and documentation must show when a feature is unavailable because of quota, sleeping/paused hosting, missing credentials, or a platform API restriction.

## 2. Free-first deployment boundary

| Layer | Initial choice | Constraint |
|---|---|---|
| Web UI | Static hosting on an available free tier (Cloudflare Pages candidate) | Static files only; not a durable worker |
| Database/Auth | Existing Supabase Free project | Respect quotas; no destructive migration or project replacement |
| Workflow definitions | Existing PostgreSQL, additive schema only after isolated test | No production DDL until migration is tested and approved |
| Queue storage | PostgreSQL-backed queue design | Durable records do not execute themselves |
| Execution | Manual, foreground/test execution first | Stops when the executing process is unavailable |
| Scheduling | Design now; activate only when a reliable free scheduler/worker is verified | No claim of guaranteed 24/7 execution |
| AI | Bring-your-own existing key only if user already has one; otherwise mock/local deterministic provider | Never assume a free AI API quota |
| Social publishing | Draft/review first; official connector only after eligibility and permissions are verified | No scraping, credential sharing, or unofficial publishing |

Cloudflare Pages is a static frontend host and must not be presented as the engine's always-on runtime. Supabase Edge Functions are request-scoped and are not a substitute for a long-running worker. A free-tier scheduled trigger may be used only after its current quota, sleep behavior, reliability, and billing requirements are verified.

## 3. Release stages

### Stage A — no-cost foundation
- Define and validate the canonical workflow JSON.
- Build workflow list/editor shell and local preview.
- Save/load definitions only after an isolated test migration is approved.
- Implement dry-run execution with deterministic built-in nodes.
- Show run timeline and node-level results.
- No external side effects.

### Stage B — authenticated private control plane
- Reuse the existing Supabase Auth session.
- Validate the access token server-side on every protected API request.
- Compare the authenticated user ID to the already configured owner ID in the existing owner settings row.
- Fail closed if the owner row is absent, null, inaccessible, or does not match.
- Do not use the owner bootstrap/claim endpoint as a general Flow authorization mechanism.
- Test authorization with owner, non-owner, expired token, missing owner row, and malformed token cases.

### Stage C — controlled integrations
- Add webhook intake and outbound HTTP only with SSRF protections, destination restrictions, timeouts, response-size limits, secret redaction, and replay/idempotency controls.
- AI node remains disabled until a provider/key and usage budget are explicitly configured.
- Social actions default to draft-only and require approval before publishing.
- Each platform connector must be validated against its official API, app review, OAuth scopes, and account eligibility.

### Stage D — optional durable scheduling
- Only activate if a genuinely free execution path is verified and remains within EGP 0.
- Clearly show that free infrastructure may sleep, throttle, or stop.
- If the owner later approves paid infrastructure, document cost and obtain approval before provisioning. Until then, do not promise 24/7.

## 4. Canonical workflow contract

A workflow is a versioned directed graph. A saved revision is immutable once execution begins.

### Top-level shape

```json
{
  "schema_version": 1,
  "workflow_id": "uuid",
  "name": "Example workflow",
  "enabled": false,
  "trigger": { "type": "manual", "config": {} },
  "nodes": [
    {
      "id": "start",
      "type": "trigger.manual",
      "version": 1,
      "position": { "x": 80, "y": 160 },
      "config": {}
    },
    {
      "id": "message",
      "type": "data.transform",
      "version": 1,
      "position": { "x": 360, "y": 160 },
      "config": { "template": "Hello from APEX FLOW" }
    }
  ],
  "edges": [
    { "id": "e-start-message", "source": "start", "source_handle": "success", "target": "message", "target_handle": "input" }
  ],
  "settings": {
    "mode": "manual",
    "require_approval_for_external_effects": true,
    "max_node_executions": 100,
    "timeout_seconds": 60
  }
}
```

The IDs above are illustrative. The server generates canonical IDs and must validate all references.

### Initial node catalog

| Node type | Purpose | Side effects |
|---|---|---|
| `trigger.manual` | Start a run manually | No |
| `trigger.schedule` | Scheduled start, disabled until scheduler is approved | No |
| `data.transform` | Map/transform JSON data | No |
| `logic.condition` | Route based on a safe expression | No |
| `ai.generate_text` | Generate text through a configured provider | External provider call; disabled without configured key/budget |
| `approval.request` | Pause pending owner decision | No external publish |
| `notification.in_app` | Add an in-app notification | Internal |
| `http.request` | Call an external HTTP endpoint | Yes; disabled until SSRF and secret protections pass |
| `social.create_draft` | Create/update a draft through existing Social AI adapter | Internal |
| `social.publish` | Publish through an eligible official connector | High impact; approval mandatory |

Unknown node types or versions must fail validation; they must never be silently skipped.

## 5. Validation rules

- Reject duplicate node and edge IDs.
- Reject edges referencing missing nodes or invalid handles.
- Reject unsupported schema/node versions.
- Reject invalid node configurations and oversized graphs.
- Reject cycles in Release 1 unless a bounded loop node is deliberately introduced later.
- Enforce one valid trigger per workflow in Release 1.
- Enforce node-count, execution-count, payload-size, and wall-clock limits.
- Never allow arbitrary code execution in a workflow.
- Never allow a workflow-supplied owner ID, role, or tenant ID to grant access.
- Credentials must be references to server-side secret records; never serialize secret values into workflow JSON or exports.

## 6. Execution and state model

Workflow run states:
- `queued`
- `running`
- `waiting_approval`
- `succeeded`
- `failed`
- `cancelled`
- `timed_out`

Node run states:
- `pending`
- `running`
- `waiting_approval`
- `succeeded`
- `failed`
- `skipped`
- `cancelled`

Rules:
- Every run points to an immutable workflow revision.
- Each node execution has a unique idempotency key.
- Retry only explicitly retryable errors, with bounded exponential backoff.
- External side effects require idempotency and approval policy checks immediately before execution.
- Cancellation is cooperative and checked between nodes and before side effects.
- Persist redacted input/output summaries, timestamps, attempt counts, and error codes.
- Never mark a run successful if any required node failed or was not executed.

## 7. Approval binding

An approval record binds to:
- workflow ID and immutable revision,
- run ID and node execution ID,
- exact action type and normalized target,
- hash of the proposed payload,
- expiry time and decision.

Any change to the action, target, or payload invalidates the approval and requires a new approval. Publishing is denied when approval is missing, expired, or does not match the payload hash.

## 8. API response envelope

Success:
```json
{ "ok": true, "data": {}, "request_id": "uuid" }
```

Failure:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Workflow is invalid" }, "request_id": "uuid" }
```

Do not return stack traces, tokens, provider secrets, database credentials, or raw upstream error bodies to the client.

## 9. Test gates before any production change

- JSON schema and node configuration unit tests.
- Graph validation tests, including duplicate IDs, missing endpoints, invalid handles, unsupported versions, and cycles.
- Deterministic dry-run tests for success, branch, failure, timeout, and cancellation.
- Authorization tests for owner/non-owner/expired/malformed/missing-owner-row.
- Approval tampering and expiry tests.
- Idempotency and duplicate-delivery tests.
- SSRF and secret-redaction tests before enabling HTTP nodes.
- Migration tested on an isolated disposable database before any production apply.
- Confirm current free-tier quotas and billing behavior before enabling any hosted runtime.

## 10. Explicitly deferred

- Guaranteed 24/7 execution on free infrastructure.
- Paid always-on worker or paid scheduler.
- Automatic public social publishing before official API eligibility is confirmed.
- Third-party module marketplace.
- Arbitrary JavaScript/Python execution.
- Multi-tenant customer onboarding.
- Any paid AI usage without explicit provider and budget approval.

## 11. Acceptance criteria for the zero-budget prototype

- Owner can create, edit, validate, save, and load a workflow.
- Owner can run a deterministic dry-run and inspect each node result.
- Invalid graphs are rejected with actionable messages.
- No external side effect occurs in dry-run mode.
- Protected APIs fail closed for non-owner and invalid sessions.
- No secret appears in workflow JSON, logs, browser storage, or exports.
- No paid service is provisioned or activated.
- UI accurately communicates that durable 24/7 execution is not yet available.
