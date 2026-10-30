# APEX SOCIAL AI — Product & Technical Foundation

## 1. Product goal
APEX SOCIAL AI is the owner-operated social media workspace inside APEX STUDIO. Release 1 manages APEX STUDIO's own social accounts. The data model is tenant-aware so client workspaces can be enabled later without mixing data.

## 2. Release 1 platforms
- Instagram
- Facebook Pages
- TikTok
- YouTube

Only official platform APIs and documented OAuth flows may be used. No password collection, browser automation against platform UIs, scraping, or bypassing platform review/permission requirements.

## 3. Core modules
1. Overview dashboard: connected-account state, drafts, scheduled/published/failed posts, engagement summaries, recent activity.
2. AI Content Studio: campaign briefs, ideas, captions, scripts, hashtag suggestions, platform-specific variants, media brief prompts.
3. Content calendar: draft/scheduled/published/failed states, timezone-aware schedule, filters by platform and campaign.
4. Approval queue: owner review, edit, approve, reject, and immutable approval history. Publishing is disabled until explicit owner approval.
5. Publishing center: per-platform connector, capability checks, media validation, idempotent publish jobs, retry policy, and status reconciliation.
6. Analytics: provider-sourced metrics with retrieval timestamps, metric definitions, date windows, and clear unavailable-data states.
7. Automation center: n8n workflow references and run status. n8n is an executor, not an authorization boundary.
8. Audit and settings: account connections, token health, permissions, security events, and owner activity.

## 4. Architecture
- Web admin and Flutter Admin are presentation clients only.
- Existing Supabase Auth, RLS, Edge Functions, and the existing `apex-ai-gateway` remain the backend foundation.
- Supabase Postgres stores tenants, social accounts, content, media metadata, approvals, publish jobs, analytics snapshots, workflow runs, and audit events.
- Edge Functions own OAuth callbacks, token exchange/refresh, provider API calls, scheduling claims, publishing, and analytics ingestion.
- Provider access tokens and refresh tokens are encrypted server-side and never returned to clients.
- n8n may receive opaque job IDs and scoped webhook credentials; it must not receive provider refresh tokens or Supabase service-role keys.
- AI agents: Research, Writer, Creative, Analyst, and Orchestrator. They can draft and recommend; they cannot approve or publish.

## 5. Tenant and authorization model
- Every tenant-owned row includes `tenant_id`.
- Release 1 provisions one APEX STUDIO tenant and only owner-authorized accounts.
- RLS denies cross-tenant reads and writes.
- Owner-only operations require a verified owner identity on the server; hiding UI controls is not authorization.
- Service-role credentials remain in Edge Function secrets only.
- Destructive actions, account disconnects, publishing, and workflow changes are audited.

## 6. Content and publishing lifecycle
`idea -> draft -> in_review -> approved -> scheduled -> publishing -> published`
Alternative terminal/recovery states: `rejected`, `failed`, `cancelled`.
- Every approval records approver, timestamp, content version, and platforms approved.
- Any edit after approval invalidates that approval and returns the item to review.
- Each publish attempt has an idempotency key and provider response reference.
- Retries use bounded exponential backoff for transient errors only; permission, validation, and policy errors require owner action.
- Scheduled jobs use UTC timestamps plus the source timezone for display.
- A platform connector must check current permissions, media constraints, account type, and publishing capability before enqueueing.

## 7. Platform constraints and readiness
- Instagram: require an eligible Professional account and the appropriate Meta app permissions/review. Validate media and publishing capabilities per API version.
- Facebook: publish to authorized Pages only, using the required Page permissions and Page access tokens.
- TikTok: use the official Content Posting API and required approved scopes; respect creator-info checks and app audit limitations.
- YouTube: use YouTube Data API with OAuth upload scope and respect quota, upload processing, and visibility requirements.
- A connector remains `not_configured` until OAuth, scopes, provider review, and a successful non-production test are verified. Do not simulate a connected state.

## 8. Initial data entities
- `social_tenants`
- `social_memberships`
- `social_accounts`
- `social_account_secrets` (server-only access; encrypted values)
- `social_campaigns`
- `social_content_items`
- `social_content_versions`
- `social_media_assets`
- `social_approvals`
- `social_publish_jobs`
- `social_publish_attempts`
- `social_analytics_snapshots`
- `social_workflow_runs`
- `social_audit_events`

All tables require explicit RLS policies, indexes for tenant/status/scheduled time, and foreign keys. Secret-bearing tables must not be readable by authenticated client roles.

## 9. API surface (Edge Functions)
- `social-oauth-start` / `social-oauth-callback`
- `social-accounts` (list, health, disconnect)
- `social-content` (create, update, version, submit-for-review)
- `social-approvals` (approve, reject)
- `social-schedule` (schedule, cancel)
- `social-publish-worker` (internal scheduled worker; never public unauthenticated)
- `social-analytics-sync` (internal scheduled worker)
- `social-webhook` (provider callbacks where supported)

Every function validates caller identity, tenant membership, ownership, payload schema, rate limits, and idempotency as applicable.

## 10. Release plan
### Phase A — Safe foundation
- Inspect existing schema and migrations before adding tables.
- Add tenant-aware schema and RLS policies.
- Add shared typed contracts and server-side authorization helpers.
- Add tests for cross-tenant isolation and owner-only operations.

### Phase B — Owner dashboard
- Add APEX SOCIAL AI navigation and overview in the web admin.
- Add content studio, calendar, approval queue, and account status views.
- Keep platform connections clearly marked as not configured until verified.

### Phase C — Content workflow
- Connect the existing AI Gateway for draft generation.
- Store prompts, outputs, versions, and usage metadata.
- Add approval invalidation when content changes.

### Phase D — Publishing connectors
- Implement one connector at a time after credentials, app review, scopes, and sandbox/test accounts are available.
- Start with manual owner-triggered publishing; enable scheduling only after idempotency and reconciliation tests pass.

### Phase E — Flutter Admin and analytics
- Add mobile views using the same Edge Function contracts.
- Add provider-sourced analytics and exportable reports.
- Add operational alerts and audit review.

## 11. Acceptance criteria
- No platform password is requested or stored.
- No secret or service-role key is shipped to web/mobile clients.
- RLS tests prove tenant isolation.
- No AI agent can approve or publish.
- Editing approved content invalidates approval.
- Every publish attempt is idempotent and auditable.
- Unconfigured or unapproved connectors cannot publish.
- Provider failures are shown accurately; no fake success metrics.
- Web and Flutter clients use the same server contracts.
- Automated tests and production build pass before merge.

## 12. Explicit non-goals for Release 1
- Client tenant activation.
- X integration.
- Auto-publishing without owner approval.
- Unofficial scraping or UI automation.
- Paid ads campaign management or ad spend controls.
