# APEX SOCIAL AI — Edge Function API Contracts

Status: proposed server contract; no function is deployed by this document.

## Security boundary

- Browser and Flutter clients call Edge Functions only. They never query social tables directly.
- Every owner route requires a valid Supabase access token, verified with `auth.getUser(token)`.
- After authentication, the server verifies the caller against the existing `apex_owner_settings.owner_user_id`. A matching email address or client-supplied role is not sufficient.
- Privileged database access uses a server-only Supabase secret/service-role key. Never return it, provider tokens, encryption material, or raw provider errors.
- Do not trust tenant IDs supplied by clients. Resolve the active tenant server-side from the configured owner membership/tenant record.
- Apply bounded request sizes, strict schemas, rate limits, CORS allowlists, no-store responses, and audit events to mutations.
- All publishing and destructive actions require a fresh owner authorization check and an explicit confirmation step.

## Common response envelope

Success:
```json
{ "ok": true, "data": {}, "request_id": "uuid" }
```

Failure:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Safe user-facing message" }, "request_id": "uuid" }
```

Use stable machine-readable error codes. Never include stack traces, SQL text, access tokens, provider response bodies, or secret values.

## Functions and actions

### `social-api`

Authenticated owner-only API for the dashboard and content workspace.

- `GET /overview`: counts by content state, connected-account status, latest audit activity, and latest provider-sourced analytics timestamp.
- `GET /accounts`: account metadata only; omit all credential columns and token material.
- `GET /content?status=&platform=&from=&to=&cursor=`: paginated content items with latest version metadata.
- `POST /content`: create an `idea` or `draft` item and its first immutable content version. Reject client attempts to set approval, publishing, or provider fields.
- `PATCH /content/:id`: create a new version, update editable metadata, and invalidate any approval for the previous version. Never mutate an existing version body.
- `POST /content/:id/submit-review`: transition draft to `in_review`; reject empty content and unsupported platform targets.
- `GET /approvals`: list pending review items and their exact version IDs.
- `POST /approvals/:id/decision`: owner decision only; accepts `approved` or `rejected`, comment, and approved platform list. The server checks that the referenced version is still the current version.
- `POST /schedule`: create jobs only for approved content versions, eligible connected accounts, and supported content/platform combinations. Require a client idempotency key.
- `POST /schedule/:jobId/cancel`: cancel only jobs that have not begun publishing.
- `GET /analytics?account_id=&from=&to=`: return stored provider-sourced metrics with source and fetched-at metadata. Do not fabricate missing metrics.

### `social-oauth-start` and `social-oauth-callback`

- Start creates a short-lived, single-use, server-stored OAuth state bound to the owner session and provider.
- Callback validates state, expiry, one-time use, redirect URI, issuer/provider response, and required scopes before exchanging the code.
- Tokens are encrypted server-side before writing to `private.social_account_secrets`.
- Client responses contain account metadata and connection status only.
- Do not accept arbitrary redirect URLs. Use exact registered callback and post-auth destinations.

### `social-publish-worker`

- Internal scheduler/worker only; no public unauthenticated invocation.
- Claims due jobs atomically with a lease/claim token and bounded execution window.
- Re-checks approval/version/account/tenant consistency and provider capability immediately before publishing.
- Uses the stored idempotency key; records every attempt and provider request reference.
- Retries only transient failures with bounded exponential backoff. Permission, validation, policy, and review failures become actionable permanent failures.
- No publish occurs when the account is not verified as connected or the approval does not match the exact current content version.

### `social-analytics-sync`

- Internal worker that fetches only documented provider metrics for authorized accounts.
- Stores metric key, value, period, API version, and retrieval timestamp.
- Missing or unavailable provider metrics remain explicitly unavailable; never substitute estimates as provider facts.

### `social-webhook`

- Provider-specific signature verification, replay protection, timestamp window, and event deduplication.
- Reject unsigned or unverifiable callbacks. Do not trust account/tenant IDs in callback payloads without resolving them against stored provider references.

## State transition rules

- `idea -> draft -> in_review -> approved -> scheduled -> publishing -> published`
- Alternative states: `rejected`, `failed`, `cancelled`.
- Editing content creates a new immutable version and invalidates the prior approval.
- Approval is bound to one content item, one exact version, and an explicit set of target platforms.
- Scheduling must prove the approval belongs to the same tenant, content item, version, and selected account.
- A job is unique per approved version/account/idempotency key.
- A worker must not infer approval from UI state or a client-supplied status field.

## Required database invariants before write endpoints

The initial schema must additionally enforce or transactionally validate:

1. An approval's content item and content version belong to the same tenant and the same item.
2. A publish job's approval belongs to the same tenant, content item, and exact content version as the job.
3. The approved platform list includes the target account platform.
4. A job cannot be inserted unless its content version is the current version and the approval is still valid.
5. Only one active job may exist for a given content-version/account pair unless a deliberate republish workflow is introduced.

Use a database transaction/RPC for multi-row state changes. Do not implement these invariants as separate client requests.

## Rollout order

1. Verify the schema migrations on an approved disposable/staging database.
2. Add server auth and owner-check tests.
3. Implement read-only `social-api` routes and test safe projections.
4. Implement content/version writes transactionally.
5. Implement approval and scheduling state transitions.
6. Add OAuth connectors one provider at a time after app registration, scopes, and review.
7. Enable the internal worker only after idempotency, retries, and reconciliation tests pass.

No function in this contract is considered production-ready until its auth, tenant-isolation, negative-permission, and failure-path tests pass.
