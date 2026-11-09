# APEX STUDIO Public Website Vanilla Migration Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the public APEX STUDIO website's React/TypeScript frontend with plain HTML, CSS, and JavaScript while preserving its current tested user journeys and backend contracts.

**Architecture:** Keep the current Vite/React public implementation, admin, Social AI, and payment entry points intact as a baseline during migration. Build the vanilla public experience in isolated files, reuse the existing Supabase RPC/Edge Function contracts through a small browser JavaScript data layer, and switch only the public `index.html` entry point after parity tests pass. Admin, Social AI, payment, Flutter, database, and live service configuration are outside this migration.

**Tech Stack:** HTML5, CSS, browser JavaScript modules, existing Supabase JS client boundary (only if it can be consumed without reintroducing a frontend framework), existing Vite multi-page build until the public route is migrated, Vitest for existing tests, and browser-based smoke tests.

## Global Constraints

- Public website target: HTML, CSS, JavaScript only; no React, TypeScript, Next.js, or Flutter.
- Preserve working behavior and backend contracts.
- Do not migrate admin, Social AI, or payment pages in this phase.
- Do not expose Supabase service-role keys, AI provider secrets, or payment secrets in client code.
- Keep the existing public implementation available for comparison until parity is verified.
- No production deployment, live configuration change, destructive migration, or merge to `main` without owner approval.
- The official APEX black/gold identity with blue AI accents, Arabic/English, RTL/LTR, responsive behavior, reduced-motion support, and approved reference images remain design constraints.
- Do not invent company facts, customer counts, project status, testimonials, prices, or capabilities.

---

### Task 1: Complete the baseline contract and asset inventory

**Files:**
- Read: `apex/index.html`
- Read: `apex/src/main-production.tsx`
- Read: `apex/src/styles.css`
- Read: `apex/src/vr-showroom.css`
- Read: `apex/src/payment.css`
- Read: `apex/src/lib/site.ts`
- Read: `apex/src/lib/backend.ts`
- Read: `apex/src/lib/supabase.ts`
- Read: `apex/src/ai/client.ts`
- Read: `apex/src/admin.tsx`, `apex/src/social-ai.tsx`, `apex/src/payment.tsx` only to establish shared build boundaries
- Create: `docs/website-migration-contract.md`

**Interfaces:**
- Consumes: current `filterProjects`, `validateProjectRequest`, `captureEvent`, `submitProjectInquiry`, anonymous-session and AI Edge Function contracts.
- Produces: documented behavior inventory, RPC payload/response contracts, routes, assets, and explicit migration exclusions.

- [ ] **Step 1: Inventory all public interactions and route behavior**

Record each nav action, locale toggle, project filter/detail, project request field and validation rule, AI chat lifecycle, owner follow-up, contact link, payment navigation, showroom control, and footer link. Mark any feature whose behavior cannot be verified from source as unverified.

- [ ] **Step 2: Verify backend contracts from migrations and Edge Functions**

Locate the SQL definitions and function handlers for `capture_site_event`, `capture_project_inquiry`, visitor conversation persistence, owner follow-up, and AI requests. Record exact argument names, auth requirements, error behavior, and RLS assumptions. Do not modify them.

- [ ] **Step 3: Inventory all assets and current build entry points**

List fonts, images, icons, CSS imports, public paths, Vite inputs, and workflow artifact paths. Identify any Vite-only behavior required by non-public pages.

- [ ] **Step 4: Record findings**

Create `docs/website-migration-contract.md` with behavior-to-test mapping and a list of unverified behavior.

- [ ] **Step 5: Verify documentation consistency**

Run: inspect the recorded paths and compare every named function/route against its source.
Expected: no undocumented public interaction or accidental inclusion of admin/payment/social migration.

- [ ] **Step 6: Commit the inventory**

Commit only the documentation file on `feature/vanilla-website-migration`.

---

### Task 2: Build the static design shell and bilingual navigation

**Files:**
- Create: `apex/vanilla/index.html`
- Create: `apex/vanilla/css/tokens.css`
- Create: `apex/vanilla/css/layout.css`
- Create: `apex/vanilla/css/components.css`
- Create: `apex/vanilla/js/app.js`
- Create: `apex/vanilla/js/i18n.js`
- Create: `apex/vanilla/js/navigation.js`
- Create: `apex/vanilla/tests/i18n.test.js`
- Modify only after parity: `apex/index.html`

**Interfaces:**
- `getLocale()` returns `'ar'` or `'en'` from saved preference or document/browser default.
- `setLocale(locale)` updates `html.lang`, `html.dir`, translated text, and saved preference.
- `navigateTo(sectionId)` scrolls to an existing section and closes the mobile navigation.
- `initPublicSite()` initializes locale, navigation, reduced-motion-safe reveal behavior, and accessible controls.

- [ ] **Step 1: Add failing locale and direction tests**

Test initial English fallback, saved Arabic preference, `dir=rtl` for Arabic, `dir=ltr` for English, and persistence after switching.

- [ ] **Step 2: Verify expected test failure**

Run the focused browser-compatible test command after selecting a vanilla-compatible test harness.
Expected: tests fail because the new locale module does not yet exist.

- [ ] **Step 3: Implement semantic static shell**

Build the APEX black/gold shell, blue AI accent tokens, keyboard-visible focus styles, mobile menu, locale toggle, page sections, and reduced-motion behavior. Keep copy in a separate locale dictionary. Do not copy placeholder statistics or fabricated testimonials.

- [ ] **Step 4: Verify locale behavior**

Run the focused test.
Expected: all locale, direction, and persistence assertions pass.

- [ ] **Step 5: Run browser smoke checks**

Verify mobile menu, language switch, RTL layout, keyboard navigation, and `prefers-reduced-motion` behavior in a real browser.

- [ ] **Step 6: Commit the shell**

Commit only the static shell, locale/navigation modules, and focused tests.

---

### Task 3: Port projects, inquiries, analytics, and AI journeys

**Files:**
- Create: `apex/vanilla/js/projects.js`
- Create: `apex/vanilla/js/inquiries.js`
- Create: `apex/vanilla/js/analytics.js`
- Create: `apex/vanilla/js/assistant.js`
- Create: `apex/vanilla/js/supabase-client.js` only if the public browser client can be configured using the existing publishable key safely
- Create: `apex/vanilla/tests/projects.test.js`
- Create: `apex/vanilla/tests/inquiries.test.js`
- Create: `apex/vanilla/tests/assistant.test.js`

**Interfaces:**
- `filterProjects(projects, category, query, locale)` preserves the current filtering behavior.
- `validateProjectRequest(draft)` preserves current validation rules and user-facing outcomes.
- `submitProjectInquiry(draft)` invokes the existing `capture_project_inquiry` RPC and returns its inquiry identifier or a safe user-facing error.
- `captureEvent(event)` invokes the existing `capture_site_event` RPC with the same event fields and session semantics.
- `AssistantController` preserves current conversation restore/send/save, suggested questions, owner follow-up request, and convert-to-project-brief behavior using the exact existing backend contract.

- [ ] **Step 1: Add focused failing tests**

Cover category filtering, Arabic and English search, invalid email, empty name, short brief, missing consent, successful inquiry RPC payload, rejected RPC response, analytics failure isolation, conversation restore, message send, and owner follow-up state.

- [ ] **Step 2: Verify expected failures**

Run the focused vanilla test command.
Expected: failures identify missing modules or missing required behaviors, not test harness/setup errors.

- [ ] **Step 3: Implement minimum browser modules**

Use DOM APIs and ES modules only. Reuse the existing public publishable-key boundary; never add service-role or provider secrets. Keep network calls behind explicit modules. Do not claim a conversation was saved until the backend confirms it.

- [ ] **Step 4: Verify focused tests**

Run the same focused test command.
Expected: all project, inquiry, analytics, and assistant assertions pass.

- [ ] **Step 5: Verify backend integration**

Against a safe test environment, verify inquiry creation, analytics capture, conversation restore/send, owner follow-up, and rate-limit/error paths. If a test environment is unavailable, mark these checks Not Tested and do not claim end-to-end success.

- [ ] **Step 6: Commit the user journeys**

Commit the browser modules and tests as an independently reviewable change.

---

### Task 4: Visual parity, route switch, and release gate

**Files:**
- Modify: `apex/vanilla/index.html`
- Modify: `apex/index.html` only after acceptance
- Modify: `apex/vite.config.ts` only if required to keep admin/payment/social routes building without React on the public route
- Modify: `apex/package.json` only after all remaining React entry points and imports are accounted for
- Create: `docs/website-migration-test-report.md`

**Interfaces:**
- Public production route serves the vanilla site.
- `admin.html`, `social-ai.html`, and `payment.html` continue to load their existing implementations unchanged.
- Existing Supabase RPC and Edge Function contracts remain unchanged.

- [ ] **Step 1: Add route and regression checks**

Test that the public root uses only vanilla HTML/CSS/JS and that admin, Social AI, and payment entry points still resolve to their existing React bundles during the transition.

- [ ] **Step 2: Verify the baseline and migration checks**

Run: `npm test` and `npm run build` from `apex/` where the current package scripts exist, plus Flutter checks only in the actual Flutter project directories.
Expected: baseline checks are recorded; any pre-existing failure is distinguished from migration regressions.

- [ ] **Step 3: Switch only the public entry point**

Point `apex/index.html` to the vanilla app only after all required journeys pass. Keep other HTML entry points and their React dependencies intact.

- [ ] **Step 4: Verify complete regression suite**

Run: `npm test` and `npm run build` from `apex/`, then browser smoke tests for all public routes and all excluded routes.
Expected: tests pass; all four HTML entry points load; public site has no React runtime dependency; admin, Social AI, and payment still work as before.

- [ ] **Step 5: Produce the release report**

Record tested browsers/devices, language and direction results, accessibility/performance results, integration evidence, untested paths, and known issues. Do not claim production readiness if any critical journey remains unverified.

- [ ] **Step 6: Commit and request review**

Commit the verified migration on `feature/vanilla-website-migration`. Do not merge or deploy. Open a reviewable pull request only after the owner asks or the review process is otherwise authorized.

---

## Unresolved decisions and external dependencies

- Confirm whether `apex/` and `flutter_admin/` represent two distinct Flutter apps or one stale/duplicate app; this is outside the public-site migration.
- Confirm the current GitHub Pages deployment target and whether the checked-in Flutter Web workflow is obsolete; no deployment workflow will be changed during the website migration without evidence.
- Confirm a safe Supabase test project/environment for end-to-end testing; production data and live settings will not be used for destructive tests.
- AI provider/model, Paymob, 10-minute auto-reply, and final deployment remain owner-approval items.
