# APEX STUDIO — Public Website Migration: Verified Contract Inventory

Audit date: 2026-11-09
Target branch: feature/vanilla-website-migration

## Scope boundary

This migration applies only to the public website. Keep the existing React admin, Social AI, payment entry points, Flutter applications, Supabase Edge Functions, database schema, and production deployment unchanged until each is separately audited and approved. The current React implementation remains the behavior reference until parity is demonstrated.

## Confirmed repository facts

- `apex/package.json` defines a Vite + React 18 + TypeScript application, with `build` running `tsc -b && vite build` and `test` running Vitest.
- `apex/vite.config.ts` configures React and four HTML entry points: `index.html`, `admin.html`, `payment.html`, and `social-ai.html`.
- `apex/index.html` currently loads `/src/main-production.tsx`; the public entry is therefore still React-based.
- The public page source contains Arabic/English copy and direction switching, project-category filtering, project details, project inquiry form, section analytics, anonymous Supabase session bootstrap, visitor AI chat, owner follow-up chat, immersive showroom, contact links, payment information, and reduced-motion handling.
- The public inquiry flow calls `submitProjectInquiry` and `captureEvent` from `src/lib/backend.ts`. The form validates name, email, project description and contact consent before submission; it also passes a conversation ID when available.
- The production audit dated 2026-10-29 documents the server-side functions `apex-client-chat`, `apex-ai-gateway`, `apex-owner-bootstrap`, `kashier-create-invoice`, `kashier-payment`, and `kashier-webhook`.
- That audit documents anonymous visitor sessions, owner/client conversation persistence, inquiry ownership checks, analytics RPCs, RLS, and server-side Kashier payment reconciliation. These contracts must not be reimplemented or weakened in the public frontend migration.
- The same audit states that real Groq API invocation, live/sandbox Kashier end-to-end payment, OTP delivery, two-client IDOR browser testing, and mobile Core Web Vitals were not verified at that audit date.

## Deployment pipeline discrepancy — release blocker

The current `.github/workflows/deploy.yml` says it deploys a Flutter app and runs `flutter pub get`, `flutter analyze`, `flutter test`, and `flutter build web` from the `apex/` directory.

At the same time, `apex/package.json` and `apex/vite.config.ts` describe the Vite/React multi-page application, and the existing production audit reports a successful TypeScript/Vite build and deployment in an earlier workflow run.

This is a source-level mismatch, not yet a proven current CI failure. Before changing the workflow, inspect recent workflow runs and verify which artifact is actually published. Do not silently switch production hosting from Flutter to Vite or vice versa.

## Public frontend parity checklist

The vanilla implementation must preserve or deliberately account for:

1. Arabic/English locale selection, document `lang`, and RTL/LTR direction.
2. Responsive navigation and all in-page navigation targets.
3. Project listing, category filters, keyboard-accessible project detail interaction, and inquiry entry points.
4. Project inquiry validation, consent, loading/success/error states, and existing backend submission contract.
5. Page-view, section-view, project-view, and CTA analytics where currently implemented.
6. Anonymous Supabase session initialization before visitor-owned data operations.
7. Visitor AI assistant, suggested prompts, conversation persistence, and conversion of a conversation into a project brief.
8. Separate owner follow-up chat behavior and its existing server authorization.
9. Contact details, email/phone/WhatsApp/social links, and footer destinations.
10. Payment information and links without creating or confirming payments in the public UI.
11. Reduced-motion behavior, keyboard access, focus states, semantic landmarks, and mobile layout.
12. Existing SEO title, description, theme color, and social metadata.

## Security and data rules

- No Supabase service-role key, AI provider key, payment secret, or other privileged credential may appear in browser code.
- Use only the existing public/anon Supabase configuration and existing server-side Edge Function contracts.
- Preserve authentication/session ownership semantics and server-side authorization. Hiding a control in the UI is never authorization.
- Do not trust client-supplied payment status, owner identity, inquiry ownership, or conversation ownership.
- Validate and normalize user input in the browser for usability, while retaining server-side validation as the security boundary.
- Do not add the proposed timed automatic AI fallback reply unless the owner separately approves it.
- Do not change AI provider/model, payment provider, database schema, RLS, Edge Functions, or production secrets as part of this website-only phase.

## Evidence completed in the isolated migration branch

- Inspected the existing public React source, backend RPC helpers, Supabase client, contact configuration, CMS schema migration, CMS editor, current public Flutter CMS reader, and `apex-client-chat` Edge Function request/response contract.
- Confirmed the public `apex_site_content` read policy is limited to published rows. The table contained zero rows at the time of the read-only 2026-11-09 query.
- Added vanilla helper tests for project filtering, inquiry validation, safe storage, analytics argument mapping, CMS project/service mapping, transcript formatting, and chat pagination cursor selection.
- Added a dedicated GitHub Actions validation workflow. The latest verified run is **#147**, which passed dependency install, JavaScript syntax checks, the full Vitest suite, and the multipage Vite build.
- Added isolated About, Services, Work, project-detail, and service-detail page entry points without changing the root public entry.
- Added a documented release boundary in `apex/vanilla/README.md` and `docs/audits/2026-11-09-vanilla-quality-pass.md`.

## Evidence still required before switching the public entry

- Browser/device QA at desktop, tablet, and mobile sizes.
- Visual and behavioral parity review against the existing React implementation, including Arabic RTL, English LTR, keyboard navigation, reduced motion, forms, chat, and payment-information section.
- Controlled end-to-end Supabase smoke tests for inquiry submission, visitor chat, direct owner chat, analytics, and published CMS content.
- Accessibility review and measured Core Web Vitals.
- Verify the latest deployment artifact and resolve the Flutter-versus-Vite deployment discrepancy before proposing any production workflow change.
- Switch `apex/index.html` only after parity and release checks pass. Keep rollback to the existing React entry straightforward.

## Implementation decision

Build the new public website in an isolated vanilla directory first. Do not replace the current entry point while parity is incomplete. Port behavior in small tested slices, reuse stable server contracts, and document any behavior that cannot be reproduced without additional backend work.
