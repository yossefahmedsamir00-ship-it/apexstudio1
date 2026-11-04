# APEX STUDIO CMS Implementation Plan

> **For agentic workers:** Execute the tasks in order on the isolated branch. Each task is independently reviewable and uses checkbox tracking.

**Goal:** Deliver a secure, bilingual Supabase-backed CMS managed through Flutter Admin, integrate published content into the APEX website with fallback rendering, and complete the requested motion system.

**Architecture:** The public React app reads only published revisions through the Supabase Data API. Flutter Admin edits draft revisions and uses server-verified roles for publishing and membership administration. The current hardcoded site content remains a safe fallback until seeded CMS content is verified.

**Tech Stack:** React, TypeScript, Vite, Vitest, Flutter/Dart, supabase_flutter, Supabase Postgres/RLS/Storage/Edge Functions, GitHub Actions.

## Global Constraints

- Work on `docs/apex-cms-design`; do not write to `main`.
- Do not apply migrations to production, deploy Edge Functions, deploy the website, or merge a PR without separate explicit authorization.
- Preserve current inquiries, customer chat, payments, analytics, owner dashboard, and emergency controls.
- Keep the existing `apex_owner_settings` owner verification as the owner bootstrap boundary; do not create a second owner identity mechanism.
- Public clients can read only published revisions. Drafts and administrator data remain inaccessible to anonymous visitors.
- Never put Supabase secret/service-role keys in website or Flutter client code. Never authorize from editable `user_metadata`.
- Explicitly grant only the required Data API privileges; new public tables are not automatically exposed as of the October 30, 2026 Data API change.
- Every public-schema table added by this feature must have RLS enabled and least-privilege policies.
- Saving a draft cannot change public content. Publishing must be atomic and role-checked. Rollback creates a new revision.
- Unknown section types must be skipped safely; malformed content or CMS unavailability must use the built-in fallback.
- Respect `prefers-reduced-motion`; do not animate expensive full-screen blur filters.
- Use a red-green-refactor cycle for every behavior change. If a focused red test cannot be run because repository execution is unavailable, report that limitation rather than claiming TDD evidence.
- Run full website and Flutter checks before marking a task complete.

---

## Task 1: Typed CMS document contracts and safe parsing

**Files:**
- Create: `apex/src/cms/types.ts`
- Create: `apex/src/cms/parse.ts`
- Create: `apex/src/cms/parse.test.ts`
- Modify: `apex/src/lib/site.ts` only if a shared type can be reused without a breaking change.

**Interfaces:**
- `Locale` and `LocalizedText` remain compatible with `apex/src/lib/site.ts`.
- Export `CmsDocumentType`, `CmsRevisionStatus`, `CmsDocument`, `CmsRevision`, `PageSection`, `MenuItem`, `ThemeDocument`, and `MediaAsset`.
- Export `parseCmsPage(value: unknown): CmsPageDocument | null`, `parseCmsNavigation(value: unknown): NavigationDocument | null`, and `parseCmsTheme(value: unknown): ThemeDocument | null`.
- Parse only supported section types. Unknown section types are excluded; malformed top-level documents return `null`.

- [ ] **Step 1: Add focused failing tests**
  - Valid bilingual page parses and preserves section order.
  - A malformed top-level page returns `null`.
  - An unknown section is skipped while known sections remain.
  - Nested navigation items preserve order and children.
  - Malformed navigation returns `null`.

- [ ] **Step 2: Verify red**
  - Run: `cd apex && npm test -- --run src/cms/parse.test.ts`
  - Expected: module or exported parser is missing and the focused assertions fail for the missing behavior.

- [ ] **Step 3: Implement minimum contracts and parser**
  - Define the supported section discriminants and localized content fields.
  - Parse unknown JSON defensively without unsafe casts at the public boundary.
  - Preserve section and menu ordering as supplied; do not silently reorder content.

- [ ] **Step 4: Verify green**
  - Run the same focused test command.
  - Expected: all parser tests pass.

- [ ] **Step 5: Run website tests**
  - Run: `cd apex && npm test`
  - Expected: all existing and new Vitest tests pass.

- [ ] **Step 6: Commit**
  - `git add apex/src/cms apex/src/lib/site.ts && git commit -m "feat(cms): add typed content contracts"`

## Task 2: Published content repository and fallback contract

**Files:**
- Create: `apex/src/cms/repository.ts`
- Create: `apex/src/cms/repository.test.ts`
- Create: `apex/src/cms/fallback.ts`
- Modify: `apex/src/lib/supabase.ts` only if the existing client export cannot be reused.

**Interfaces:**
- `loadPublishedPage(pageKey: string): Promise<CmsPageDocument | null>`
- `loadPublishedNavigation(): Promise<NavigationDocument | null>`
- `loadPublishedTheme(): Promise<ThemeDocument | null>`
- `getFallbackPage(): CmsPageDocument`
- `getFallbackNavigation(): NavigationDocument`

- [ ] **Step 1: Add focused failing tests**
  - Repository requests only documents with a published revision pointer.
  - A valid published payload is parsed into the typed document.
  - A query error, empty result, or malformed payload returns `null` rather than throwing into the React render tree.
  - Fallback page and navigation are non-empty and preserve the current website's content ordering.

- [ ] **Step 2: Verify red**
  - Run: `cd apex && npm test -- --run src/cms/repository.test.ts`
  - Expected: the repository and fallback exports are missing.

- [ ] **Step 3: Implement repository and fallback**
  - Reuse the existing `supabase` client.
  - Select only the published revision relationship; do not request drafts.
  - Keep database calls behind a small injectable seam for deterministic tests.
  - Keep the current website constants as fallback data until the rendering migration is completed.

- [ ] **Step 4: Verify green**
  - Run the same focused test command.
  - Expected: all repository and fallback tests pass.

- [ ] **Step 5: Run website build**
  - Run: `cd apex && npm run build`
  - Expected: TypeScript and Vite build succeed.

- [ ] **Step 6: Commit**
  - `git add apex/src/cms && git commit -m "feat(cms): add published content repository"`

## Task 3: CMS database, RLS, storage, and privileged operations

**Files:**
- Create through the Supabase CLI migration generator: `supabase/migrations/<generated_timestamp>_apex_cms.sql`.
- Create: `supabase/functions/apex-cms-admin/index.ts`.
- Create: `supabase/functions/apex-cms-admin/deno.json` only if the existing Edge Function convention requires it.
- Create: focused SQL/Edge Function tests in the repository's established test layout.

**Interfaces:**
- Tables: `cms_documents`, `cms_revisions`, `cms_media_assets`, `cms_user_roles`, and `cms_audit_events`.
- Public read surface: published revisions only.
- Authenticated write surface: role-scoped draft and media operations.
- Publishing: one database transaction/function that verifies the role and revision/document relationship, switches the published pointer, and appends an audit event.
- Admin membership: Edge Function operations for invite, role change, and deactivate; all operations verify the caller server-side.

- [ ] **Step 1: Add failing authorization tests**
  - Anonymous role cannot read drafts or administrator membership.
  - Anonymous role can read only published revisions.
  - Editor can create/update drafts but cannot publish or change roles.
  - Admin can publish but cannot grant or elevate an Owner.
  - Owner can manage membership.
  - A failed publish leaves the previous published revision pointer unchanged.
  - Storage upload and replacement are allowed only for CMS-authorized users.

- [ ] **Step 2: Verify red**
  - Run the repository's Supabase SQL/Edge Function test command after confirming it from package/config files.
  - Expected: CMS schema/functions are absent and the new authorization assertions fail.

- [ ] **Step 3: Implement schema and policies**
  - Inspect current `apex_owner_settings`, audit conventions, role bootstrap, grants, and policies before writing SQL.
  - Enable RLS on every CMS table.
  - Grant only required privileges to `anon` and `authenticated`; do not assume default Data API exposure.
  - Keep role-check helpers in a non-exposed schema and restrict execute grants.
  - Use both `USING` and `WITH CHECK` on updates.
  - Create a private or appropriately restricted media bucket and Storage policies.
  - Keep service-role credentials only in the Edge Function environment.

- [ ] **Step 4: Verify green**
  - Run focused database/Edge Function tests against a disposable or development Supabase database.
  - Expected: each role can perform only its permitted operations; public queries cannot access drafts.

- [ ] **Step 5: Run security advisors**
  - Run Supabase security advisors on the development project.
  - Expected: no new CMS-related RLS/grant/function exposure findings.

- [ ] **Step 6: Commit**
  - Commit the migration, function, and tests together after local validation.

## Task 4: Website CMS rendering and menu integration

**Files:**
- Modify: `apex/src/main-production.tsx`
- Modify: `apex/src/styles.css`
- Create: `apex/src/cms/render.tsx` if a typed section renderer can be separated cleanly.
- Create: focused rendering tests.

**Interfaces:**
- React reads published page/navigation/theme documents from Task 2.
- A typed renderer maps supported section types to existing APEX section components.
- If CMS loading fails or a document is invalid, the current hardcoded page is rendered.

- [ ] **Step 1: Add failing rendering tests**
  - A valid CMS document renders its enabled sections in order.
  - Disabled sections are omitted.
  - Unknown sections do not crash the page.
  - CMS loading failure renders the existing fallback content.
  - Arabic and English content render according to the active locale.

- [ ] **Step 2: Verify red**
  - Run focused Vitest rendering tests.
  - Expected: the CMS renderer is missing.

- [ ] **Step 3: Implement rendering integration**
  - Preserve current project modal, inquiry form, AI chat, owner chat, payment, analytics, and locale behavior.
  - Make the public menu use the published navigation document, including nested More items.
  - Keep static fallback content intact until the seeded CMS output is visually compared.

- [ ] **Step 4: Verify green**
  - Run focused rendering tests.
  - Expected: CMS and fallback cases pass.

- [ ] **Step 5: Run full website checks**
  - Run: `cd apex && npm test && npm run build`
  - Expected: all tests and production build pass.

- [ ] **Step 6: Commit**
  - `git add apex/src/main-production.tsx apex/src/styles.css apex/src/cms && git commit -m "feat(site): render published CMS content"`

## Task 5: Motion system and sequential More menu

**Files:**
- Modify: `apex/src/main-production.tsx`
- Modify: `apex/src/styles.css`
- Create: focused motion helper tests if stagger calculation is extracted as a pure function.

**Interfaces:**
- Existing `IntersectionObserver` reveal lifecycle remains the single reveal mechanism.
- CSS defines `.apex-reveal`, `.apex-revealed`, directional/scale variants, and stagger custom properties.
- More menu applies stagger values to parent and nested items when opened.

- [ ] **Step 1: Add failing tests for any extracted stagger helper**
  - Delay values increase monotonically with item index.
  - Nested items receive a later delay than their parent group.
  - Delay is capped so large menus do not become unusably slow.

- [ ] **Step 2: Verify red**
  - Run focused Vitest helper tests.
  - Expected: the helper is missing.

- [ ] **Step 3: Implement CSS and menu behavior**
  - Add opacity/transform reveal styles that match the existing observer classes.
  - Add restrained blur background using static gradients and lightweight transform/opacity motion.
  - Add subtle pressed scale and restrained neon glow.
  - Disable non-essential effects under `prefers-reduced-motion: reduce`.
  - Avoid continuous animated blur filters and avoid animation on reduced-motion devices.

- [ ] **Step 4: Verify green**
  - Run focused helper tests and inspect the rendered page at desktop/mobile sizes.
  - Expected: sequential reveal works, More menu and children appear in order, and reduced-motion displays all content immediately.

- [ ] **Step 5: Run website checks**
  - Run: `cd apex && npm test && npm run build`
  - Expected: all tests and build pass.

- [ ] **Step 6: Commit**
  - `git add apex/src/main-production.tsx apex/src/styles.css apex/src/cms && git commit -m "feat(site): add staggered motion effects"`

## Task 6: Flutter Admin CMS workspace

**Files:**
- Modify: `flutter_admin/lib/main.dart` only for navigation integration and repository wiring.
- Create: `flutter_admin/lib/cms/cms_models.dart`
- Create: `flutter_admin/lib/cms/cms_repository.dart`
- Create: `flutter_admin/lib/cms/cms_pages.dart`
- Create: `flutter_admin/lib/cms/cms_editor.dart`
- Create: focused Dart tests under `flutter_admin/test/cms/`.

**Interfaces:**
- `CmsRepository`: list documents, load revisions, save draft, publish revision, list history, restore revision, list/upload media.
- `CmsRole`: owner, admin, editor.
- CMS screens receive the existing authenticated Supabase client/session; all writes remain subject to backend authorization.

- [ ] **Step 1: Add failing widget/repository tests**
  - CMS destination appears without removing existing destinations.
  - Editor can edit and save a draft but cannot see/execute publish actions.
  - Admin can publish but cannot manage Owner membership.
  - Owner can manage membership.
  - Failed save preserves entered content and displays an error.
  - Page section order and nested navigation order are preserved.

- [ ] **Step 2: Verify red**
  - Run: `cd flutter_admin && flutter test test/cms`
  - Expected: CMS types/repository/widgets are missing.

- [ ] **Step 3: Implement Flutter CMS**
  - Add Pages, Section Editor, Navigation, Media, Preview, History, and Publish workflows.
  - Keep the existing app shell, auth gate, dashboard, inbox, payments, security, activity, and controls.
  - Treat UI role visibility as convenience only; backend authorization is authoritative.

- [ ] **Step 4: Verify green**
  - Run: `cd flutter_admin && flutter test test/cms`
  - Expected: focused tests pass.

- [ ] **Step 5: Run Flutter checks**
  - Run: `cd flutter_admin && flutter analyze && flutter test && flutter build apk --debug`
  - Expected: analysis, tests, and Android debug build succeed.

- [ ] **Step 6: Commit**
  - `git add flutter_admin && git commit -m "feat(admin): add CMS workspace"`

## Task 7: End-to-end verification and review handoff

**Files:**
- Modify: `docs/specs/2026-11-04-apex-cms-design.md` only to record verified implementation decisions.
- Modify: `README.md` or setup docs only if new required environment configuration is introduced.

- [ ] **Step 1: Run full verification**
  - Run: `cd apex && npm test && npm run build`
  - Run: `cd flutter_admin && flutter analyze && flutter test && flutter build apk --debug`
  - Run: Supabase role tests and security advisors on the development database.
  - Expected: all commands exit zero; no CMS-related security finding remains.

- [ ] **Step 2: Review diff and acceptance criteria**
  - Compare each task and the approved design against the final diff.
  - Confirm no secret keys, generated local build artifacts, or production-only configuration were committed.

- [ ] **Step 3: Open a draft PR**
  - Open a draft PR from `docs/apex-cms-design` to `main`.
  - Include test results, limitations, and any migration/deployment steps still requiring separate approval.

## Unresolved operational decisions

- Whether a separate Supabase development branch/project is available for database role and Storage integration tests. Do not create a billable Supabase branch without handling its cost-confirmation flow.
- Whether the current production static content should be migrated as one initial published page revision or split into multiple page documents. The implementation should preserve current page rendering either way; decide after inspecting the exact section boundaries and URL structure.


---

## Implementation progress — 2026-11-04

- [x] CMS design and implementation plan recorded on the feature branch.
- [x] Typed CMS contracts and defensive page/navigation/theme parsing added under `apex/src/cms/`.
- [x] Stagger-delay helper and tests added; reduced-motion-aware reveal and menu styling added to the website.
- [x] A dedicated Flutter Admin CI workflow added for `flutter_admin/`.
- [x] A local-first Flutter CMS workspace added with demo content, status filtering, create/edit drafts, and local preview.
- [x] CMS destination integrated into the existing Flutter Admin navigation without changing the existing authentication gate or data repository.
- [ ] Confirm Flutter Admin analysis, widget tests, and web build in GitHub Actions.
- [ ] Build the website CMS management UI and published-content renderer with fallback.
- [ ] Implement database schema, RLS, storage, and privileged publish operations only against a disposable/development Supabase environment.
- [ ] Add role-aware CMS workflows, revision history, and media management after the backend contract is verified.
- [ ] Complete full end-to-end verification and review the PR.

**Current safety boundary:** The Flutter CMS workspace uses in-memory demo data only. It does not read or write Supabase CMS tables, does not publish content, and does not modify the production database. The dedicated Flutter Admin workflow is the verification source for this app; the separate `apex/` Flutter Pages workflow targets a different Flutter project and is not a substitute for this check.
