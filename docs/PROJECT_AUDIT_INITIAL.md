# APEX STUDIO — Repository Audit (Initial)

**Date:** 2026-11-09  
**Repository:** `yossefahmedsamir00-ship-it/apexstudio1`  
**Baseline:** `main`  
**Working branch:** `feature/vanilla-website-migration`  
**Status:** Initial audit; not a complete security or runtime verification.

## Executive summary

The current public website is a Vite + React + TypeScript application, which conflicts with the owner's confirmed target of plain HTML, CSS, and JavaScript. The repository also contains separate React entry points for the admin dashboard, Social AI dashboard, and payment page. Flutter projects exist in both `apex/` and `flutter_admin/`; their intended ownership and deployment roles must be verified before either is changed.

The migration will be incremental. The existing application remains the reference implementation while the public website is rebuilt in vanilla HTML/CSS/JS on an isolated branch. Existing backend contracts and working user journeys must be preserved.

## Confirmed repository facts

| Area | Observed state | Implication |
|---|---|---|
| Public website | `apex/index.html` loads `src/main-production.tsx`; Vite, React 18, TypeScript 5 are dependencies | Must be replaced for the public site after parity is proven |
| Build tooling | `apex/vite.config.ts` defines Vite multi-page inputs | Vite currently builds public, admin, payment, and Social AI entry points |
| Admin | `apex/admin.html` loads `src/admin.tsx` and `src/owner-login-lock.ts` | Do not migrate admin as part of the public-site migration |
| Social AI | `apex/social-ai.html` loads `src/social-ai.tsx` | Keep isolated until its own approved migration |
| Payment | `apex/payment.html` loads `src/payment.tsx`; current code invokes the `kashier-payment` Edge Function | Preserve this route and payment verification flow; do not change live payment configuration |
| Backend | `src/lib/supabase.ts`, `src/lib/backend.ts` provide anonymous session, analytics, and inquiry RPC calls | Reuse the existing Supabase public-client contract without exposing privileged keys |
| AI | `src/ai/client.ts` calls a configured server-side AI API with a Supabase access token | Preserve server-side provider boundary; no provider/model change is authorized |
| Tests | `src/lib/site.test.ts` covers project filtering and inquiry validation | Existing tests are TypeScript/Vitest and do not yet test the vanilla site |
| Flutter | `apex/pubspec.yaml` and `flutter_admin/pubspec.yaml` both exist | Determine intended app responsibilities before consolidation |
| CI | `.github/workflows/deploy.yml` installs Flutter and builds `apex/` as Flutter Web, while `apex/package.json` describes Vite/React | Workflow and actual deployment artifact appear inconsistent; verify run history before changing CI |

## Existing public-site behavior identified

- Arabic/English content and RTL/LTR switching.
- Responsive landing page with hero, work gallery, services, process, about, CTA, and payment information.
- Project category filtering and project detail modal.
- Project inquiry modal, validation, and Supabase inquiry RPC.
- Anonymous Supabase session bootstrap.
- Analytics events for page views, section views, CTA clicks, and project views.
- Visitor AI assistant with saved conversation, suggested questions, owner follow-up request, and project-brief conversion in the production entry point.
- WhatsApp/email/phone contact links.
- Immersive showroom and reduced-motion reveal behavior.
- Separate admin, Social AI, and hosted invoice pages.

These are source-level observations, not proof that each flow currently succeeds in a deployed environment.

## Risks and conflicts

1. **Technology conflict:** React/TSX is currently required by the public entry point. Migration must avoid breaking admin, Social AI, and payment pages that share the Vite build.
2. **CI/deployment mismatch:** the checked-in workflow's Flutter Web build target does not match the Vite application files. Confirm recent Actions results and actual hosting configuration before changing deployment.
3. **Backend dependencies:** anonymous auth, RPC names, AI endpoint, Edge Functions, and RLS policies must be preserved and verified.
4. **Hardcoded content:** project and service data are currently present in frontend source; dynamic CMS behavior requires a separate verified database contract.
5. **External services:** payment provider and AI provider remain owner-controlled decisions. No secrets or production settings will be changed.
6. **Unverified assets and runtime:** repository-wide asset inventory, mobile browser checks, and live backend tests remain outstanding.

## Migration boundary

- Migrate only the public website to HTML/CSS/JavaScript.
- Keep the existing React admin, Social AI, and payment applications untouched during the public-site migration.
- Keep Supabase, database schema, Edge Functions, authentication, and provider configuration unchanged unless a specific incompatibility is proven and approved.
- Preserve the old React public entry point temporarily as a comparison/reference until the vanilla implementation passes parity checks.
- Do not merge into `main`, deploy, or alter live services without explicit owner approval.

## Verification still required

- Full source and asset inventory for `apex/`.
- Current GitHub Actions status and deployment configuration.
- Supabase migrations, RLS policies, and Edge Function contracts.
- Existing admin and Social AI permission boundaries.
- Runtime tests for inquiry submission, visitor conversation persistence, owner follow-up, and hosted invoice status.
- Browser tests for Arabic/English, RTL/LTR, mobile, keyboard accessibility, and reduced motion.

## Next gate

Complete the inventory and document the exact frontend/backend contracts. Then build the vanilla public site in parallel on this branch, porting one user journey at a time and testing each before switching the public entry point.
