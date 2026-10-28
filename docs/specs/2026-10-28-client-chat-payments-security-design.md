# APEX STUDIO — Client Chat, AI Handoff, Payments & Security Design

Date: 2026-10-28
Status: Proposed design for review (not implementation)

## Goals
- Present the studio owner's approved public contact details: م/ يوسف احمد, yossefahmedsamir00@gmail.com, +201110568882.
- Allow website visitors and the owner to exchange client messages.
- If the owner has not responded to a conversation for 10 minutes, let an AI assistant provide clearly disclosed first-line support and escalate when human judgment is needed.
- Prepare online payments suitable for an Egypt-based website, without enabling live money collection until merchant onboarding and credentials are configured.
- Implement and test a server-side AI gateway and perform scoped, non-destructive security checks.

## Existing context confirmed
- Frontend is Vite + React + TypeScript under `apex/`.
- The existing AI client posts to `VITE_AI_API_URL`; no server-side AI Edge Function was found during the check.
- Supabase project currently has no Edge Functions and no tables in the public schema.
- Supabase Security Advisor reports that `public.rls_auto_enable()` is a SECURITY DEFINER event-trigger function executable by anon/authenticated. Inspection shows it loops over CREATE TABLE commands in public and enables RLS. Do not blindly drop it; review grants and behavior before any change.

## Recommended architecture
1. **Frontend (Vite/React):** public contact links, service/project inquiry form, chat UI, conversation status, payment checkout entry point.
2. **Supabase Auth + Postgres + Realtime:** authenticated owner access; visitor/customer identity strategy chosen to avoid exposing other clients' conversations. Use RLS on all exposed tables and least-privilege policies.
3. **Supabase Edge Functions:** server-side AI gateway; chat handoff/escalation; payment-session creation; provider webhook verification. Keep provider keys server-side. Do not trust browser-supplied payment success.
4. **AI provider:** configurable through server secrets. Validate role, message size/count, model allowlist, and output. Apply abuse controls and budget limits where feasible.
5. **Payment provider:** evaluate Paymob first because its official materials describe Egyptian online checkout, cards, mobile wallets and hosted checkout. Fawry Accept is a fallback. Use sandbox first; live mode requires merchant approval, verified account, and credentials. Never collect card details directly in this site.
6. **Delivery:** branch + pull request, CI tests/build, preview/review, then merge/deploy only after checks pass.

## Chat and 10-minute AI fallback
- Persist conversations/messages with timestamps and ownership boundaries.
- Start the 10-minute waiting window when a customer message needs an owner response. Use server-side timestamps, not the client's clock.
- If the owner has not responded within 10 minutes, AI may send a labeled assistant response. It must not claim to be a human, impersonate the owner, promise refunds/prices/deadlines, or perform sensitive account/payment actions.
- Notify the owner of new conversations and AI-handled messages where supported. Provide a clear human follow-up path.
- Avoid duplicated replies with idempotency and a server-side status/lock. Rate-limit public chat and apply message length limits.
- Define retention/deletion behavior and avoid collecting unnecessary personal data.

## Payments
- Start with Paymob hosted checkout in test mode; use provider-created payment sessions from the server.
- Verify signed webhooks server-side and reconcile provider status before marking an invoice paid.
- Store only transaction references, amount/currency, status, and minimum metadata. Never store PAN/CVV or expose API/HMAC secrets.
- Live activation is blocked until the owner completes merchant onboarding and configures secrets securely. Provider availability does not guarantee account approval.

## Security and verification
- Review frontend secrets, CORS, input validation, authentication, RLS policies, privilege boundaries, error handling, rate limiting, webhook signatures, and payment state transitions.
- Run controlled, non-destructive tests only against this repository/project: malformed requests, unauthenticated access, cross-conversation access attempts, XSS payload handling, injection strings, rate-limit behavior, secret leakage checks, and payment webhook forgery/replay checks in sandbox.
- Fix confirmed findings and repeat the relevant tests. Report each result as pass, finding, fixed/retested, or not verified. Do not claim a full penetration test or perfect security.
- Investigate the SECURITY DEFINER warning for `public.rls_auto_enable()`; restrict execution only after verifying event-trigger dependencies and required privileges.

## Error handling and observability
- Return safe, non-sensitive errors to clients; retain enough server logs for debugging without logging secrets, full payment data, or unnecessary message content.
- Fail closed when AI or payment provider configuration is missing. Show clear fallback UI rather than simulating success.
- Track AI provider failures, webhook verification failures, and chat handoff state transitions.

## Acceptance criteria
- Contact details display correctly and links use mailto/tel.
- Owner-only conversations are inaccessible to other visitors under RLS tests.
- AI fallback does not trigger before the 10-minute server-side threshold and is clearly labeled.
- AI provider credentials never appear in frontend bundles or responses.
- Payment sandbox flow creates a server-side checkout session and cannot mark an order paid without verified provider confirmation.
- CI tests and production build pass; deployment URL is checked.
- Security findings and remaining unverified items are documented.

## Constraints and external prerequisites
- Paymob requires merchant onboarding and credentials for production; use test credentials for development.
- Configure secrets through Supabase's secure project secrets interface, not in source control or chat.
- Real-time notifications, AI responses, and payments must be tested in the actual connected environment before they are described as live.
- Scope includes the APEX STUDIO repository and linked Supabase project only. No destructive tests, denial-of-service, or testing of unrelated systems.

## Visual direction update (approved by owner on 2026-10-28)
- Combine all three directions into one cohesive system: Digital Luxury + Bold Digital + AI Future.
- Core identity: near-black surfaces, premium metallic gold, controlled fire-red accents, electric/cool blue accents, oversized editorial typography, cinematic lighting, and selective 3D/abstract imagery.
- Hero: bold concise value proposition, high-impact art direction, visible primary inquiry CTA and secondary project-exploration CTA.
- Work/services: expressive project cards and layouts with strong hierarchy; avoid generic template repetition.
- AI/chat areas: restrained glass-like panels, clear state labels, smooth transitions, and accessible contrast.
- Motion: purposeful scroll reveals and hover/press feedback; honor prefers-reduced-motion, avoid heavy perpetual animations, and keep mobile performance first-class.
- Responsive design: design mobile deliberately rather than shrinking desktop; keyboard focus states, semantic structure, readable contrast, and usable touch targets remain required.
- Do not claim a visual trend is objectively dominant without evidence; use this as the selected creative direction, not a claim about all 2026 websites.
- Acceptance criteria: design is coherent across hero, project grid, service sections, chat, and mobile; no section uses all accent colors simultaneously; production build remains successful.
