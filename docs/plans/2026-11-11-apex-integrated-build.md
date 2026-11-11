# APEX STUDIO Integrated Build Implementation Plan

> **For agentic workers:** Execute task by task on `feat/apex-integrated-build`. Keep each task reviewable and independently testable.

**Goal:** Deliver APEX STUDIO as a coherent bilingual digital-studio website, Flutter owner app, and secure shared Supabase backend, using the best compatible skills and patterns without damaging existing working versions.

**Architecture:** Use the existing framework-free website in `apex/vanilla/` as the target public web experience (HTML/CSS/ES modules), while preserving the current React production entry until vanilla parity is verified. Use `flutter_admin/` as the owner app and the existing Supabase migrations/Edge Functions as the shared backend. Keep the older `apex/lib/` Flutter prototype and React site as legacy/reference surfaces until their dependencies and deployment roles are verified; do not delete them during this build.

**Tech Stack:** Semantic HTML, CSS, browser JavaScript ES modules, Vite/Vitest; Flutter/Dart; Supabase Auth, PostgreSQL/RLS, Edge Functions; GitHub Actions.

## Global Constraints

- Visual identity: deep black/graphite foundation with electric blue and cyan as the primary accents. Gold/red are not primary brand accents.
- Support Arabic RTL and English LTR on every public and owner-facing surface.
- Responsive from narrow Android phones (including low-end devices) through desktop; no horizontal overflow.
- Prefer lightweight CSS motion and progressive enhancement. Respect reduced-motion preferences; do not require heavy 3D assets for core usability.
- Keep the public website framework-free HTML/CSS/JavaScript. Keep the owner application Flutter/Dart.
- Preserve existing Supabase table, RPC, Edge Function, authentication, and chat contracts unless a reviewed additive migration is necessary.
- Never expose service-role keys, AI provider secrets, payment secrets, or private client records in browser/mobile code.
- Use the existing Supabase backend; do not invent a second backend or provider.
- Do not perform production deployments, live payment activation, destructive database changes, PR merges, or releases without explicit user approval.
- Do not install every discovered skill or repository. Curate only relevant, licensed, compatible, reviewed workflows and record provenance.
- Preserve current branches and production entrypoints. No file deletions or broad moves during the initial integration.
- Clearly label concept/demo portfolio projects; do not invent customer counts, reviews, revenue, project outcomes, or live links.

---

### Task 1: Establish the APEX engineering skill set and source-of-truth map

**Files:**
- Create: `.agents/skills/apex-vanilla-web/SKILL.md`
- Create: `.agents/skills/apex-motion-system/SKILL.md`
- Modify: `.agents/skills/apex-flutter-ui/SKILL.md`
- Modify: `AGENTS.md`
- Reference: `apex/vanilla/README.md`, `apex/README.md`, `flutter_admin/README.md`, `docs/plans/2026-11-09-vanilla-website-migration.md`

**Interfaces:**
- Codex discovers project skills from `.agents/skills/<skill-name>/SKILL.md`.
- Web skill owns vanilla HTML/CSS/JS implementation and existing Vite/Vitest contracts.
- Motion skill owns motion principles, reduced-motion behavior, and performance budgets.
- Flutter skill owns `flutter_admin/` only; it must not propose a duplicate Flutter public website.

- [x] Import the six APEX-specific skills from PR #28 onto this integration branch.
- [x] Update Flutter UI skill to use electric blue/cyan and scope it to the owner app.
- [x] Add focused vanilla-web and motion skills with explicit triggers and stop conditions.
- [x] Verify all eight skill frontmatter blocks, names, paths, and AGENTS.md routing.

**Verification:**
- Inspect every new `SKILL.md` and confirm valid YAML frontmatter with unique names.
- Confirm `AGENTS.md` points only to skills that exist in this branch.

### Task 2: Unify the visual system without replacing the web architecture

**Files:**
- Modify: `apex/vanilla/styles.css`
- Modify: `apex/vanilla/editorial.css`
- Modify: `flutter_admin/lib/main.dart`
- Modify: `flutter_admin/lib/dashboard_v2.dart`
- Modify: `flutter_admin/lib/cms_page.dart`
- Modify: `flutter_admin/lib/dashboard_v2.dart`
- Test: `apex/vanilla/design-system.test.js`
- Test: `flutter_admin/test/widget_test.dart`

**Interfaces:**
- CSS custom properties in `apex/vanilla/styles.css` own public-site colors, typography, spacing, borders, and motion.
- Flutter theme in `flutter_admin/lib/main.dart` owns app-wide ColorScheme and component themes.
- Reusable Flutter glass panels and stats cards consume theme tokens instead of inventing a second palette.

- [x] Add regression tests for required electric-blue/cyan design tokens and the Flutter theme's primary/secondary colors.
- [ ] TDD red was not captured before the production palette edits; do not claim a recorded red-green cycle. Add this as a follow-up verification debt.
- [x] Implement the shared near-black/graphite, electric-blue, cyan, muted-slate, and visible-focus token set in the selected website and Flutter owner-app surfaces.
- [x] Replace legacy gold-led emphasis in the selected target surfaces; retain red only for semantic danger/status use.
- [x] Verify reduced-motion rules already exist in the selected website styles and retain them while applying the palette.
- [x] Update dashboard glass panels and chart accents to consume the shared Flutter `ColorScheme` rather than hardcoded legacy blue shades.
- [x] GitHub Actions passed website tests/build, vanilla migration checks, Flutter analyze/tests, and Android debug APK build on the current PR head. Browser visual review remains outstanding.

**Acceptance:**
- Public site and owner app visibly share the same black/electric-blue/cyan identity.
- Text and focus indicators remain legible; no gold-led or red-led theme remains in the selected target surfaces.
- No new runtime dependency is required for the theme.

### Task 3: Complete the public vanilla website as the public-site source of truth

**Status:** Not started in this integration checkpoint. The existing site remains in place; only the shared palette and its regression checks have been updated.

**Files:**
- Modify as needed: `apex/vanilla/index.html`, `about.html`, `services.html`, `work.html`, `project.html`, `service.html`
- Modify as needed: `apex/vanilla/app.js`, `page.js`, `project.js`, `site-core.js`, `site-data.js`, `project-preview.js`, translation modules, and their existing tests.
- Reference only: `apex/src/main-production.tsx` and `apex/src/admin.tsx` until parity and deployment are reviewed.

**Interfaces:**
- Published website content comes from the existing `apex_site_content` contract.
- Project inquiries use the existing `capture_project_inquiry` RPC.
- Visitor and owner chat use the existing `apex-client-chat` Edge Function contract.
- Project previews accept only the existing validated HTTPS preview configuration; user-supplied code is never executed on the website origin.

- [ ] Add/adjust tests for public page boot, Arabic RTL/English LTR, CMS published-only filtering, project detail states, inquiry success/failure, chat retry/history, and safe preview URL handling.
- [ ] Verify existing failing tests before implementation.
- [ ] Complete the homepage, services, work, about, and project/service detail pages with consistent navigation, metadata, empty/loading/error/success states, and keyboard access.
- [ ] Ensure all portfolio items are marked as concepts or client work based on verified source data.
- [ ] Keep the site usable when Supabase is unavailable by retaining clearly marked curated fallback content and showing honest failure states for actions that need the backend.
- [ ] Run `cd apex && npm test` and `cd apex && npm run build`.

**Acceptance:**
- All public routes render without a backend connection.
- Published CMS content appears; draft/unpublished content is not publicly addressable.
- Inquiry and chat errors do not falsely report success.
- Preview links reject unsafe or malformed URLs.
- 375px, 768px, 1024px, and 1280px layouts have no horizontal overflow.

### Task 4: Finish the Flutter owner app as the single owner-control surface

**Files:**
- Modify as needed: `flutter_admin/lib/main.dart`, `dashboard_v2.dart`, `cms_page.dart`, `push_notifications.dart`
- Modify as needed: `flutter_admin/test/widget_test.dart`, `dashboard_v2_test.dart`, `cms_page_test.dart`

**Interfaces:**
- Owner identity is verified through the existing `apex-owner-bootstrap` Edge Function.
- CMS uses the existing `apex_site_content` table and owner RLS policy.
- Client inbox uses the existing `apex-client-chat` owner actions.
- Push device registration uses the existing `apex_owner_push_devices` table.

- [ ] Add failing widget tests for dashboard navigation, CMS draft/publish states, inbox empty/loading/error states, and narrow-screen overflow.
- [ ] Implement the smallest UI changes needed to complete dashboard, content management, client inbox, notifications, and owner-facing project summaries.
- [ ] Preserve existing owner authentication and device-token cleanup behavior.
- [ ] Keep sensitive finance, inquiry, and conversation data visible only to the verified owner.
- [ ] Run `cd flutter_admin && flutter test` and `cd flutter_admin && flutter analyze`.

**Acceptance:**
- Owner-only screens remain gated by verified owner identity.
- CMS actions report saved/published only after the backend confirms success.
- Inbox and notification flows have explicit empty, loading, retry, and error states.
- Narrow-screen layouts do not overflow.

### Task 5: Audit and harden the shared Supabase contracts

**Status:** Initial static review recorded in `docs/audits/2026-11-11-apex-backend-security-review.md`. This is not a live database audit; transactional social workflows and database authorization tests remain open.

**Files:**
- Review: `supabase/migrations/*.sql`
- Review: `supabase/functions/apex-client-chat/index.ts`, `apex-owner-bootstrap/index.ts`, `apex-ai-gateway/index.ts`, payment and social functions as relevant.
- Review: `supabase/tests/social_ai_security.sql`, `docs/SECURITY_SETUP.md`, `docs/PRODUCTION_AUDIT_2026-10-29.md`

**Interfaces:**
- Browser and Flutter clients use publishable credentials only.
- Privileged actions use verified auth context and server-side secrets.
- Database access follows explicit grants and RLS policies; owner authorization is never inferred from user-editable metadata.

- [x] Perform an initial actor/resource/action review for CMS, chat, owner, AI gateway, payments, and social workspace paths; formal matrix remains to be completed.
- [x] Review the primary CMS/chat/owner/AI/payment/social Edge Function paths and migration policies; remaining functions and views still require a complete pass.
- [ ] Add automated database negative tests for unauthenticated access, wrong-owner access, cross-client conversation access, malformed input, and invalid payment status transitions.
- [ ] Propose additive reversible migrations only when current contracts cannot meet the approved behavior.
- [ ] Do not apply migrations to production or rotate live secrets in this task.

**Acceptance:**
- No service-role, AI, or payment secret is present in client code or committed examples.
- Cross-user reads/writes are denied by database/server authorization.
- Security claims are limited to checks actually executed.

### Task 6: Integrate, verify, and prepare a reviewable release

**Files:**
- Modify only the verified deployment entrypoints and workflows after parity is demonstrated.
- Update: `apex/README.md`, relevant docs, and CI workflows when needed.

**Interfaces:**
- The public website build output and hosting workflow must use one explicitly selected entrypoint.
- Flutter owner app build/test remains separate from public website deployment.
- Existing production site remains available until the replacement passes acceptance.

- [ ] Run all website and Flutter checks and inspect their actual output.
- [ ] Capture mobile and desktop renders and test keyboard navigation, reduced motion, Arabic RTL, and English LTR.
- [ ] Review the final diff for secrets, accidental deletions, unrelated changes, duplicate code, and undocumented contract changes.
- [ ] Create a draft PR from `feat/apex-integrated-build` to `main` with exact test evidence.
- [ ] Stop before merge or deployment and request explicit user approval.

**Acceptance:**
- All checks and remaining blockers are reported honestly.
- Main and production deployment remain unchanged until the user approves the release.
- The handoff includes PR link, changed files, verified behavior, test results, and remaining configuration the user must supply.

---

## Unresolved decisions that affect production only

- Whether the vanilla website replaces the current React entrypoint after parity review.
- The final public contact details, approved brand assets, and which portfolio projects are real client work versus concepts.
- Which social, messaging, and payment integrations should be enabled in production and their provider/account configuration.
- The approved production rollout date and hosting target.
