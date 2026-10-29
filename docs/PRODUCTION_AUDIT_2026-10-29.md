# APEX STUDIO — Production audit and delivery status
Audit date: 2026-10-29

## Executive status

Status: improved, but not fully production-ready yet. The last successful GitHub Actions run (#139) passed 7 unit tests across 2 files, the TypeScript/Vite build, the high/critical dependency audit gate, and GitHub Pages deployment. A follow-up migration that links inquiry contact details to the owned conversation was applied to Supabase; its related CI run was still in progress when this report was written.

The changed Edge Functions are deployed to Supabase. No live payment or authenticated end-to-end browser workflow is claimed as tested.

## 1. Current architecture

- Frontend: Vite + React + TypeScript on GitHub Pages, with Arabic/English, public website, owner dashboard, and hosted invoice page.
- Identity: Supabase Auth, anonymous visitor sessions for public chat, and a separate one-time owner bootstrap restricted to the verified APEX owner email.
- Data: Supabase Postgres with RLS on client profiles, conversations, messages, inquiries, payment orders/events, audit logs, security events, and analytics.
- Edge Functions: apex-client-chat, apex-ai-gateway, apex-owner-bootstrap, kashier-create-invoice, kashier-payment, kashier-webhook.
- AI: server-side Groq-compatible Chat Completions endpoint pinned to the expected Groq host/path.
- Payments: Kashier hosted checkout, hashed one-time invoice tokens, session status reconciliation, signed webhook receipts, and a payment event ledger.

## 2. Changes made

### Security and API handling
- Streaming request-byte limits on chat, AI, invoice creation, payment-status, and webhook JSON bodies; bounded provider response reads.
- Strict JSON content types, input length/type validation, generic public errors, no-store response headers, and redirect rejection on server-to-server provider requests.
- Groq endpoint host/path validation, server-controlled system prompts, bounded AI history, model configuration checks, and response caps.
- Added per-user rate limits and pseudonymous network-level limits using the platform-provided cf-connecting-ip header when available. Raw IP addresses are not stored by this implementation.
- Explicit deny-only RLS policies for audit_logs, payment_events, and security_events; client roles cannot query these internal ledgers.
- Public RPC wrappers for validated inquiry and analytics capture, with execution granted to authenticated and not the anon SQL role. Public visitors establish Supabase anonymous-auth sessions first.
- Project inquiry submission validates that any conversation ID belongs to the caller; when valid, the submitted contact details are attached to that same conversation.

### Chat and owner dashboard
- Database-backed Client/AI and Client/Owner conversations, pagination, idempotency keys, read status, unread counts, owner-only actions, audit/security events, and periodic history refresh.
- Suggested questions respond to recent conversation topics.
- The owner dashboard uses Supabase Auth and server-side authorization; client-side hiding is not the security boundary.

### Payments
- Invoice amount is owner-set and stored as integer EGP minor units; the public customer link cannot alter the amount.
- Checkout link uses a high-entropy token; only its SHA-256 hash is stored.
- Kashier webhook signature is verified with the Payment API Key. The function fetches current provider session state and checks session, merchant, amount, and currency rather than trusting a browser redirect or unsigned event name.
- Restricted service-role database reconciliation records events idempotently, rejects invalid status transitions, writes audit logs, and flags partial refunds for manual review.
- Public invoice page refreshes status server-side; browser query parameters alone never mark an invoice as paid.

## 3. Verification results

| Check | Result | Evidence |
|---|---|---|
| Frontend unit tests | PASS | GitHub Actions run #139: 7 tests across 2 files passed |
| TypeScript / Vite production build | PASS | Same run |
| Dependency audit | PASS | Same run; high/critical npm audit gate passed |
| GitHub Pages deployment | PASS | Same run |
| Supabase Edge Function deployment | ACTIVE | AI gateway v6, chat v6, invoice creation v6, payment status v6, webhook v6 |
| RLS on public application tables | ENABLED | Confirmed through Postgres catalog |
| Payment reconciliation RPC permissions | PASS | Only service_role can execute; anon and authenticated cannot |
| Actual Groq API request | NOT TESTED | Requires current provider configuration and a real invocation |
| Actual Kashier sandbox payment | NOT TESTED | No merchant credentials or completed checkout were supplied |
| Live settlement/payment | NOT TESTED | Merchant onboarding and live credentials are not configured |
| Two-client IDOR browser test | NOT TESTED | Policies/grants were inspected but a full two-account browser test was not run |
| OTP delivery | NOT TESTED | Depends on Supabase Auth email template/provider configuration |
| Manual mobile QA / Core Web Vitals | NOT TESTED | CI build is not a substitute for real-device measurements |

## 4. Supabase Security Advisor

After adding explicit deny policies, the “RLS enabled with no policy” findings for audit/payment/security ledgers disappeared.

Remaining warnings:
- Leaked-password protection is disabled in Supabase Auth. Enable it in Auth settings; the connected project tools did not expose an appropriate safe Auth-settings write operation.
- Anonymous-auth access warnings remain for conversations, messages, client profiles, payment orders, inquiries, and analytics. Anonymous visitor chat is intentional; RLS and server-side ownership checks are intended to restrict each visitor to their own rows. Verify this with two separate anonymous sessions and the owner account before launch.
- Performance Advisor reports 24 unused indexes. In a low-traffic/new schema this is not proof they should be removed. Keep them until representative query plans/traffic show they are unnecessary.

## 5. Remaining risks / unfinished features

1. Owner activation: the owner settings row is not configured, and no Auth user matching the APEX contact email was found at audit time. Register and verify yossefahmedsamir00@gmail.com at /admin.html, then claim owner setup once.
2. Merchant activation: Kashier test/live credentials have not been verified as present. Test checkout, webhook delivery, refund handling and duplicate-event reconciliation remain untested. Do not accept real money until merchant onboarding is approved and a sandbox transaction is verified.
3. Email notifications: OTP/email delivery configuration has not been verified; no separate outbound email/SMS notification provider is confirmed.
4. File uploads/storage: attachment metadata exists, but a full secure upload workflow, bucket policies, upload limits, content scanning, and retention lifecycle are not completed.
5. Offline mode: sensitive operations depend on server verification, but there is no durable offline outbox/queue with conflict resolution and reconnect synchronization.
6. Incident response: security events and audit logs are captured, but owner alert delivery and an owner-operated emergency lockdown/recovery UI are not complete.
7. Client identity: anonymous chat persists in the browser's Supabase session/local storage. Client account recovery and cross-device conversation migration are not complete.
8. Security validation: no invasive or destructive penetration test was run. An authorized test matrix should include two clients, owner/client authorization, forged/replayed webhook payloads, payment amount mismatches, rate-limit abuse, session expiry, and Auth/password policy.
9. Performance: the real Core Web Vitals and production network timings have not been measured.

## 6. Required environment variables

Do not commit these secrets to GitHub or paste secret values into chat.

AI:
- AI_API_KEY
- AI_API_URL=https://api.groq.com/openai/v1/chat/completions
- AI_MODEL
- Optional AI_ALLOWED_MODELS
- APEX_FRONTEND_ORIGIN

Kashier test:
- KASHIER_MODE=test
- KASHIER_TEST_MERCHANT_ID
- KASHIER_TEST_API_KEY
- KASHIER_TEST_SECRET_KEY
- KASHIER_TEST_PAYMENT_API_KEY (required for webhook signature verification)

Production credentials must be separate and only added after merchant approval:
- KASHIER_MODE=live
- KASHIER_LIVE_MERCHANT_ID
- KASHIER_LIVE_API_KEY
- KASHIER_LIVE_SECRET_KEY
- KASHIER_LIVE_PAYMENT_API_KEY

See docs/KASHIER_SETUP.md for the setup checklist.

## 7. Rollback plan

1. Revert frontend commits that caused a regression, then let normal CI build and GitHub Pages deployment complete.
2. Redeploy a prior known-good Edge Function source version from Git history if an Edge Function regresses.
3. Do not drop payment-ledger columns/tables or reverse payment migrations when real orders exist. Prefer forward-compatible fixes; back up data before destructive schema operations.
4. If payment state is uncertain, stop new checkout creation, keep invoice records intact, and reconcile each session with Kashier before resuming. Never mark an order paid from browser state alone.
