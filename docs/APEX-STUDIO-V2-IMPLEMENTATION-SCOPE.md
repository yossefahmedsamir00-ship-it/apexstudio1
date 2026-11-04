# APEX STUDIO V2.0 — Comprehensive Update Scope

Status: implementation specification and release gate. This document does not claim that the features below are already implemented or deployed.

## Owner-approved decisions
- Public WhatsApp contact: 01110568882 (WhatsApp contact only; never treat it as a payment destination).
- Manual payment methods: Instapay and Vodafone Cash. Do not expose either destination globally or hard-code a destination in the public site. The customer first selects a method; the server returns the currently configured payment instructions for that method. Owner can change the destinations in the protected dashboard.
- Project management: full owner-only project management, including create, edit, archive/delete, publish/unpublish, ordering, category, localized content, cover/media and preview URL.
- AI authority: AI may classify, summarize, draft briefs and prepare internal tasks; external messages, promises, pricing/contract commitments, publishing, refunds and payment-state changes require explicit owner approval.
- Kashier: owner says account is ready for testing; production activation and credentials still require verification.

## Product surfaces
1. Public website
2. Web owner dashboard
3. Flutter owner application
4. Supabase database, RLS policies, Edge Functions and storage

All three interfaces must use the same server-side rules and data model. UI-only restrictions are not authorization.

## Workstreams

### A. Identity, authorization and consent
- Password-based owner login in both web and Flutter; remove the web OTP alternative so login behavior is consistent.
- Server-side owner verification for every privileged Edge Function and database operation.
- Deny by default. Public/anonymous clients must never gain owner permissions by changing client-side state or request payloads.
- Add explicit role/capability checks for owner-only project, payment, settings, inbox and audit actions.
- Require acceptance of Terms and Privacy Policy before a customer submits an inquiry or uses any flow that requires consent.
- Record consent timestamp, policy version, locale, and relevant inquiry/user identifier. Do not store unnecessary sensitive data.
- Reject missing, stale or invalid required consent on the server, not only in the browser.
- Add audit events for privileged changes, with actor, action, target, timestamp and safe metadata.
- Provide session expiry, sign-out, rate limits and safe error messages.

### B. Public site and lead capture
- Replace hard-coded demo project cards with published projects loaded from the shared backend.
- Make filters, project details, Arabic/English switching and RTL/LTR real and keyboard accessible.
- Persist validated inquiries server-side; show success only after the server confirms storage.
- Prevent duplicate submissions and add rate limiting / spam protection.
- Replace canned chat replies with the configured AI gateway. Clearly identify AI responses; provide owner handoff and persist conversations.
- Keep the public WhatsApp CTA pointed to 01110568882, with no payment semantics.
- Improve responsive layout, image sizing/lazy loading, reduced motion, metadata, accessibility and performance.

### C. Owner project studio
- Add protected CRUD and publish/unpublish workflows.
- Validate project fields and media types/size on the server.
- Use safe storage paths, upload constraints and cleanup for removed media.
- Preview drafts privately; public API returns published projects only.
- Log project creation, edits, publication and deletion/archive.

### D. Payments
- Support manual Instapay and Vodafone Cash instructions, configurable only by the owner.
- Do not show payment destination details until the customer selects a method for a specific invoice/order.
- Give each manual payment a unique order/reference and expected amount; let the customer submit a transfer reference and proof only if the owner enables that option.
- Manual transfers remain pending until the owner verifies them. Never trust a screenshot, browser callback or customer-submitted status as proof of payment.
- Keep Kashier hosted checkout and signed webhook reconciliation. Verify amount, currency, order, provider reference and final provider state on the server.
- Make payment transitions idempotent and audit all manual confirmations, failures, refunds and reversals.
- Do not claim Kashier is production-ready until a real provider test and webhook verification pass.

### E. Web dashboard and Flutter app
- Shared features and consistent authorization: overview, inquiries/leads, inbox, project studio, payments, activity, security/audit, settings.
- Owner can read/reply to conversations; message history persists and syncs between web and Flutter.
- Project CRUD and publish state available on both surfaces.
- Payment settings expose only editable destination data to the owner; never to unauthenticated clients.
- Add meaningful loading, empty, offline, retry and degraded-backend states.
- Add notification preferences. Push notifications require secure device registration and server-side targeting; sound/vibration are user-controlled and respect OS settings.
- Add analytics based on real events, with clear date ranges and definitions.

### F. AI safeguards
- AI may summarize, classify, draft, recommend and create internal pending tasks.
- AI must not independently send external messages, quote binding prices, accept contracts, publish content, mark invoices paid, issue refunds or change owner/security settings.
- All consequential actions require a visible owner approval step and an audit record.
- Treat customer messages and uploaded content as untrusted input; never let them override system policy or expose secrets.

### G. Quality, security and performance
- Add unit tests for validation and policy helpers; integration tests for Edge Functions, RLS and payment state transitions.
- Add end-to-end tests: inquiry submission -> database -> web dashboard -> Flutter dashboard -> owner reply -> client conversation.
- Add negative tests: unauthenticated access, non-owner user, missing consent, forged payment status, replayed webhook, expired invoice, oversized upload and rate-limit abuse.
- Run web typecheck/build/tests and Flutter analyze/tests/build.
- Review dependency/security alerts, secret handling, CSP/security headers, storage policies, logs and error reporting.
- Measure page weight and key loading behavior; optimize without hiding real backend failures.

## Release acceptance gates
A release is blocked unless all applicable checks pass:
1. Owner-only endpoints reject anonymous and non-owner requests.
2. Required consent is checked server-side and the exact policy version is recorded.
3. A real inquiry is stored once and appears in both dashboards.
4. Owner replies persist and appear in the client conversation.
5. Project draft/publish changes propagate consistently; unpublished projects are not public.
6. Instapay/Vodafone instructions are returned only after method selection and are never public in project/site payloads.
7. Manual payment stays pending until owner verification.
8. Kashier payment is marked paid only after verified webhook/provider reconciliation.
9. AI cannot perform consequential external actions without owner approval.
10. Web and Flutter checks pass; no production deployment before review and explicit release approval.

## Known baseline gaps from source review
- Public `apex/app.js` still renders a hard-coded project array.
- The public request form currently switches to a success view without a demonstrated persisted submission.
- Public chat currently returns a fixed canned response.
- Public language toggle currently displays an alert rather than switching the full site locale.
- Web admin currently contains an OTP path while the Flutter branch uses password login.
- Project CRUD and publish management are not present in the reviewed dashboard source.
- End-to-end data synchronization and live payment verification have not been demonstrated.

These are findings from source inspection, not proof of deployed runtime behavior. Each must be retested against the actual deployed Supabase project and website.
