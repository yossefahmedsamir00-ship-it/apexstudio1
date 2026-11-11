# APEX STUDIO Backend Security and Integration Review

**Review date:** 2026-11-11  
**Scope:** Static repository review on `feat/apex-integrated-build`. No production database, secrets, provider dashboards, or live user data were accessed. This is not a penetration test or a production security certification.

## Executive summary

No confirmed critical authorization bypass was identified in the reviewed paths. The backend has several sound foundations: owner checks are server-side, CMS content is row-protected, social tables are server-only, chat actions verify conversation ownership, AI requests are authenticated and rate-limited, and Kashier callbacks are HMAC-verified and reconciled against provider session data.

The project is not production-complete. The main gaps are social provider integration, transactional consistency in the social content workflow, and broader automated database authorization tests.

## Confirmed strengths

- **CMS ownership:** `202611050001_apex_site_content_cms.sql` grants anonymous users read access only to published rows and gates owner writes through `apex_owner_is_configured()`. The helper is `SECURITY DEFINER` with a fixed `search_path`, and execution is revoked from `PUBLIC` and `anon`.
- **Owner push devices:** `202611050002_apex_owner_push_devices.sql` scopes read/write policies to the configured owner and the current `auth.uid()`.
- **Client chat:** `apex-client-chat/index.ts` validates the Supabase user token, scopes client history/send operations to `client_user_id`, checks owner actions separately, bounds request bodies, and fails closed when the rate limiter is unavailable.
- **AI gateway:** `apex-ai-gateway/index.ts` requires an authenticated user, bounds input size/history, applies per-user and network rate limits, keeps the provider key server-side, and restricts the configured provider endpoint.
- **Payments:** `kashier-payment/index.ts` uses an expiring high-entropy checkout token whose hash is stored server-side. `kashier-webhook/index.ts` verifies HMAC signatures and fetches the provider session before reconciling payment state.
- **Social data isolation:** `202610310001_apex_social_ai_foundation.sql` enables and forces RLS on social tables, revokes client-role table privileges, and keeps provider credentials in the private schema. `social-api/index.ts` requires a verified user and tenant membership, checks write/approval roles, and scopes visible queries to the selected tenant.

## Findings and follow-up work

### Medium — social content writes are not transactional

**Evidence:** `supabase/functions/social-api/index.ts`, actions `content.generate`, `content.version`, and `approval.decide`.

- Content generation creates the content item and version in separate requests. If the version insert fails, the draft item remains without its initial version.
- Approval inserts an approval row and then updates the content item status separately. The status-update error is not checked before returning success.
- Version numbering is read-then-insert. Concurrent editors can calculate the same next version and one request will fail on the unique constraint.

**Impact:** Partial records, misleading approval responses, and avoidable write conflicts.

**Direction:** Move each multi-step operation into a transaction-backed Postgres RPC or another atomic server-side unit. Add concurrency and rollback tests before enabling more workflow automation. No migration has been created or applied in this review.

### Medium — social API actions lack their own request budgets

**Evidence:** `social-api/index.ts`; AI calls pass through the separately rate-limited AI gateway, but the social API actions themselves do not consume action-specific rate-limit buckets.

**Impact:** An authorized but compromised or malfunctioning workspace account can repeatedly invoke database reads/writes and AI-backed workflows. The AI gateway provides a second limit for AI usage, but it does not bound every social API operation.

**Direction:** Add per-user and, where appropriate, per-tenant budgets for read, write, generation, and approval actions. Keep audit logging and fail closed when the limiter is unavailable.

### Medium — publishing and provider account connection are not implemented end-to-end

**Evidence:** `social-api/index.ts` exposes content generation/versioning/approval and a read-only ads summary. The repository has social schema tables for accounts and publish jobs, but no complete OAuth callback/token refresh/publish worker path was found in the reviewed function set.

**Impact:** The dashboard must not present publishing, account connection, or live ad management as operational until official provider authorization and publishing workflows are implemented and tested.

**Direction:** Implement one provider at a time using official APIs, server-side encrypted credentials, least-privilege scopes, explicit approval, idempotent jobs, retry limits, and provider-specific verification. Keep Meta Ads read-only until its official connector is configured and approved.

### Low — owner identity is configured in source rather than deployment settings

**Evidence:** `supabase/functions/apex-owner-bootstrap/index.ts` contains a fixed owner-email comparison.

**Impact:** Changing the owner requires a code deployment and makes staging/test ownership awkward. This is not by itself an authentication bypass: the function also verifies the Supabase user and performs a one-time database claim.

**Direction:** Move the configured owner identity to a server-side environment setting, validate it at startup/request time, and keep the one-time owner claim and verified-email checks.

### Low — deprecated role helper in payment reconciliation

**Evidence:** `supabase/migrations/202610290006_verified_kashier_session_reconciliation.sql` checks `auth.role()` inside a service-only function.

**Impact:** This is a maintenance concern because Supabase documents `auth.role()` as deprecated. The function is also explicitly revoked from client roles and granted to `service_role`.

**Direction:** Revisit the guard against current Supabase guidance and retain least-privilege function grants. Do not change it without a database test against the deployed Postgres/Supabase version.

## Verification gaps

- The GitHub CI runs validate website build/tests and Flutter analyze/tests/Android debug build. They do **not** prove that production Supabase migrations are applied or that RLS policies work against the live project.
- The existing SQL security test file focuses on social table isolation. Add dedicated database tests for CMS owner/non-owner access, chat cross-user denial, payment order/token handling, owner bootstrap, and social role boundaries.
- No browser-based visual review has yet verified the updated site at phone/desktop widths or in Arabic RTL and English LTR.
- No live OAuth, social publishing, payment, push-notification, or AI-provider transaction was executed as part of this review.

## Release gate

Keep PR #29 in draft. Do not merge, deploy, apply migrations, enable payment capture, or connect social accounts until the relevant feature tests and explicit owner approval are complete.
