# APEX STUDIO CMS and Flutter Admin Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the APEX STUDIO website content-driven and fully manageable from Flutter Admin, with secure publishing, media, roles, previews, and the approved motion system.

**Architecture:** Supabase Postgres is the source of truth for published website content, with drafts and version history for editorial changes. The React website reads published snapshots through a typed content repository and retains the current hardcoded experience as a fallback during migration. Flutter Admin uses authenticated Supabase sessions and narrowly scoped repository operations; privileged account administration is performed only through an authorized Edge Function.

**Tech Stack:** React 18, TypeScript, Vite, Supabase JS, Supabase Postgres/RLS/Storage/Edge Functions, Flutter, Dart, supabase_flutter, Vitest, Flutter test.

## Global Constraints

- Preserve the existing APEX STUDIO visual identity, bilingual Arabic/English behavior, RTL/LTR layout, project inquiry, payment, chat, analytics, and existing owner dashboard features.
- Website visitors can read published content only. Drafts and unpublished revisions must never be returned to anonymous clients.
- Never place Supabase secret/service-role credentials in website code, Flutter code, build artifacts, or repository files. Use publishable credentials on clients and verify user identity/role server-side for privileged operations.
- The owner role is the only role allowed to manage admin accounts and assign roles. Editors cannot grant permissions or publish unless explicitly authorized by policy.
- Preserve the current hardcoded website content as a safe fallback until the CMS seed and live reads are verified.
- All content ordering must be deterministic. Menu items support nesting and explicit ordering.
- Draft edits must not change the public website until a publish action succeeds.
- Destructive actions require confirmation; publishing and account-role changes must be recorded in the audit log.
- Motion must respect `prefers-reduced-motion`, avoid blocking first paint, and avoid introducing layout shifts. Existing IntersectionObserver reveal behavior should be extended rather than duplicated.
- Do not apply production migrations, upload production media, modify production Auth users, merge to `main`, or deploy Edge Functions/site builds without a separate explicit release approval.

---

### Task 1: Supabase CMS schema, policies, and content repository

**Files:**
- Create: `supabase/migrations/202611050001_apex_site_cms.sql`
- Create: `apex/src/lib/cms.ts`
- Create: `apex/src/lib/cms.test.ts`
- Modify: `apex/src/lib/supabase.ts` only if the existing client export needs a typed CMS integration; preserve current initialization.

**Interfaces:**
- `CmsLocale = 'en' | 'ar'`
- `CmsPage`: stable `id`, `slug`, localized title, publication status, and ordered section references.
- `CmsSection`: stable `id`, `page_id`, `section_key`, `section_type`, localized content payload, `sort_order`, `is_visible`, and publication/version metadata.
- `CmsMenuItem`: stable `id`, `menu_key`, nullable `parent_id`, localized label, destination, `sort_order`, `is_visible`.
- `CmsThemeSettings`: typed public visual settings, including motion enablement and supported theme tokens.
- `CmsPublishedSnapshot`: one consistent published payload containing pages, sections, menus, and theme settings.
- `loadPublishedSiteContent(client): Promise<CmsPublishedSnapshot>`
- `loadCmsDraft(client, pageId): Promise<CmsPublishedSnapshot>` for authenticated editorial access only.

- [ ] **Step 1: Add focused failing tests**

Add Vitest cases in `apex/src/lib/cms.test.ts` for:
1. Mapping valid database rows into a stable page/section/menu snapshot.
2. Sorting sections and sibling menu items by `sort_order`, with stable ID tie-breaking.
3. Excluding hidden sections and menu items from public output.
4. Returning a typed error when the published snapshot query fails, allowing the caller to choose its fallback.
5. Rejecting a draft response from the public loader (the public query must be scoped to published rows, not client-side filtering).

- [ ] **Step 2: Verify the relevant failure**

Run: `cd apex && npm test -- --run src/lib/cms.test.ts`

Expected: the new test module fails because the CMS mapper and repository functions do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Create migration tables for pages, sections, menu items, theme settings, content revisions, and audit events. Add foreign keys, ordering indexes, timestamps, and publication/version references. Enable RLS on every exposed table. Anonymous SELECT policies expose only published records; authenticated write policies check the server-verified role stored in a protected role table or trusted JWT claims. Do not accept a role supplied by the client as authorization. Keep service credentials out of all client code.

Implement the typed mapping and read repository. Query published content as a consistent snapshot; map nested menu items without relying on row return order. Keep draft loading behind authenticated role checks and do not make it callable by the anonymous public site.

- [ ] **Step 4: Verify the focused pass**

Run: `cd apex && npm test -- --run src/lib/cms.test.ts`

Expected: all CMS mapping, ordering, visibility, and public/draft boundary tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd apex && npm run build`

Expected: TypeScript compilation and Vite production build succeed.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add supabase/migrations/202611050001_apex_site_cms.sql apex/src/lib/cms.ts apex/src/lib/cms.test.ts
git commit -m "feat(cms): add secure site content foundation"
```

### Task 2: Website CMS rendering, seed migration, and approved motion

**Files:**
- Create: `apex/src/lib/site-content.ts`
- Create: `apex/src/lib/site-content.test.ts`
- Modify: `apex/src/main-production.tsx`
- Modify: `apex/src/styles.css`
- Modify: `apex/src/lib/cms.ts` only for a missing public snapshot adapter.

**Interfaces:**
- `SiteContent`: typed representation of hero, statement, projects, services, process, about, CTA, footer, navigation, More menu, and theme settings.
- `getFallbackSiteContent(): SiteContent`: current hardcoded website copy and lists represented as typed fallback data.
- `loadSiteContent(): Promise<{ content: SiteContent; source: 'cms' | 'fallback' }>`
- `useSiteContent()` or equivalent component state boundary: exposes content/loading/fallback state without blocking the initial render.

- [ ] **Step 1: Add focused failing tests**

Test that:
1. Every current hardcoded public section can be represented in `SiteContent` in both locales.
2. A valid CMS snapshot maps into the website model without losing Arabic or English values.
3. A failed or empty CMS response uses the fallback content and does not blank the page.
4. Hidden and unpublished items do not render.
5. More menu items preserve parent/child order and hidden descendants remain hidden.

- [ ] **Step 2: Verify the relevant failure**

Run: `cd apex && npm test -- --run src/lib/site-content.test.ts`

Expected: tests fail because the website content adapter and normalized fallback model do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Move the current `projects`, `copy`, `services`, and `process` values from `main-production.tsx` into the fallback content model without changing their displayed text or behavior. Load the published CMS snapshot after initial render and switch to it only after successful mapping. Keep existing project filters, inquiry flow, chat, payment, analytics, and locale controls working.

Extend the current IntersectionObserver reveal setup for CMS-rendered sections and nested menu entries. Use staggered CSS custom properties with bounded delays; avoid one observer per item. Add a soft, low-cost blurred background layer and press feedback using a small scale transform plus restrained neon edge glow. Ensure the More menu and nested items reveal sequentially. Do not add permanent animation loops to every content card. Keep the existing reduced-motion and reduced-data safeguards and add explicit focus-visible behavior for menu controls.

- [ ] **Step 4: Verify the focused pass**

Run: `cd apex && npm test -- --run src/lib/site-content.test.ts`

Expected: fallback, CMS mapping, bilingual, visibility, and nested-menu ordering tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd apex && npm test && npm run build`

Expected: all existing Vitest tests pass and the production website builds.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add apex/src/lib/site-content.ts apex/src/lib/site-content.test.ts apex/src/main-production.tsx apex/src/styles.css
git commit -m "feat(site): render published cms content and motion"
```

### Task 3: Flutter Admin content studio, preview, and media

**Files:**
- Create: `flutter_admin/lib/features/content/content_models.dart`
- Create: `flutter_admin/lib/features/content/content_repository.dart`
- Create: `flutter_admin/lib/features/content/content_studio_page.dart`
- Create: `flutter_admin/test/features/content/content_repository_test.dart`
- Modify: `flutter_admin/lib/main.dart` to register the Content Studio route/navigation while preserving existing pages.
- Modify: `flutter_admin/pubspec.yaml` only if a required, compatible test dependency is missing.

**Interfaces:**
- `ContentRepository.loadPages()`
- `ContentRepository.loadDraft(pageId)`
- `ContentRepository.saveDraft(snapshot)`
- `ContentRepository.publish(pageId)`
- `ContentRepository.archiveSection(sectionId)`
- `ContentRepository.reorderSections(pageId, orderedIds)`
- `ContentRepository.uploadMedia(file, metadata)`
- `ContentStudioPage`: list pages/sections, edit localized content, reorder, preview draft, publish, and inspect save/publish status.

- [ ] **Step 1: Add focused failing tests**

Add Dart tests for:
1. Mapping page, section, and nested menu JSON into typed models.
2. Saving a draft without changing the published snapshot.
3. Publishing only the selected draft revision.
4. Reordering sections with an exact ordered ID list.
5. Showing a repository error when an upload or save fails rather than displaying a false success state.

- [ ] **Step 2: Verify the relevant failure**

Run: `cd flutter_admin && flutter test test/features/content/content_repository_test.dart`

Expected: tests fail because the CMS models/repository do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Build a Content Studio screen consistent with the current dark/gold/cyan Flutter Admin theme. Support editing localized text, section visibility, images, button labels/targets, navigation and More menu hierarchy, section order, save draft, preview, and publish. The preview must render the draft data without publishing it. Add confirmation before archive/delete and show explicit loading, success, and failure states. Upload media to a dedicated Storage bucket through authenticated user-scoped policies; store file metadata and public asset references, not binary file contents, in content rows.

Keep existing overview, leads, inbox, payments, activity, security, and controls routes intact. Do not add owner/admin/editor account creation in the Flutter client; that is a separate secured endpoint in Task 4.

- [ ] **Step 4: Verify the focused pass**

Run: `cd flutter_admin && flutter test test/features/content/content_repository_test.dart`

Expected: all repository behavior tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `cd flutter_admin && flutter analyze && flutter test`

Expected: analyzer reports no errors and all Flutter tests pass.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add flutter_admin/lib/features/content flutter_admin/lib/main.dart flutter_admin/test/features/content
git commit -m "feat(admin): add flutter content studio"
```

### Task 4: Secure admin roles, publishing workflow, audit trail, and release verification

**Files:**
- Create: `supabase/functions/apex-cms-admin/index.ts`
- Create: `supabase/functions/apex-cms-admin/index.test.ts` if the existing Deno test conventions support deterministic function tests.
- Create: `flutter_admin/lib/features/users/user_management_page.dart`
- Create: `flutter_admin/test/features/users/user_management_test.dart`
- Modify: `flutter_admin/lib/features/content/content_repository.dart`
- Modify: `supabase/migrations/202611050001_apex_site_cms.sql` only if test findings require a corrected schema before it is applied.
- Modify: `flutter_admin/lib/main.dart` to add owner-only user management navigation.

**Interfaces:**
- Edge Function actions: `list_admins`, `invite_admin`, `set_admin_role`, `deactivate_admin`, `publish_page`, `restore_revision`.
- Every action verifies the caller's Supabase Auth user and protected role on the server. Only owner can invite/deactivate admins or change roles. Admin/editor capabilities are enforced server-side, not only by hiding UI controls.
- `UserManagementPage`: owner-only view for listing accounts, inviting an account, changing permitted roles, and deactivating access.

- [ ] **Step 1: Add focused failing tests**

Test role authorization at the Edge Function boundary and Flutter UI boundary:
1. Anonymous callers are rejected.
2. An editor cannot publish or change roles.
3. An admin cannot invite/deactivate accounts or promote themselves.
4. Only the owner can invite/deactivate accounts and assign roles.
5. Publishing creates an immutable revision and updates the published pointer atomically.
6. Restoring a revision creates a new revision rather than mutating historical content.
7. Audit entries record actor, action, target, and timestamp for publish, restore, role changes, and deactivation.

- [ ] **Step 2: Verify the relevant failure**

Run: `cd supabase/functions/apex-cms-admin && deno test` and `cd flutter_admin && flutter test test/features/users/user_management_test.dart`

Expected: focused tests fail because the secured admin function and user-management screen do not exist.

- [ ] **Step 3: Implement the minimum behavior**

Implement the Edge Function with explicit action allow-list, authenticated caller lookup, role verification from protected server-side data, input-shape checks, and audit writes. Use service credentials only in Edge Function secrets. Keep publish operations transactional so the revision and published pointer cannot diverge. Invite/deactivate through Supabase Auth Admin APIs only after owner verification. Never return secret keys or privileged Auth metadata to Flutter.

Implement owner-only user management UI and wire the Flutter content publishing workflow to the secured function. Ensure editors can only save drafts; publish rights are assigned explicitly by the owner. Provide an audit-log view for content and account administration.

- [ ] **Step 4: Verify the focused pass**

Run: `cd supabase/functions/apex-cms-admin && deno test` and `cd flutter_admin && flutter test test/features/users/user_management_test.dart`

Expected: authorization matrix, publishing, restore, and audit tests pass.

- [ ] **Step 5: Run full verification**

Run:
- `cd apex && npm test && npm run build`
- `cd flutter_admin && flutter analyze && flutter test`
- `cd supabase/functions/apex-cms-admin && deno test`

Expected: all website tests/build, Flutter analysis/tests, and Edge Function tests pass.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add supabase/functions/apex-cms-admin flutter_admin/lib/features/users flutter_admin/lib/features/content flutter_admin/test/features/users
git commit -m "feat(admin): secure cms publishing and role management"
```

---

## Unresolved product decisions

1. **Admin role capabilities:** The recommended default is Owner = full control, Admin = content and operational management but no user-role administration, Editor = draft editing only. Confirm whether Admin should be allowed to publish.
2. **Preview method:** The recommended default is an authenticated preview route on the website using a short-lived, server-validated preview token. Confirm whether this is acceptable, or whether preview should be embedded inside Flutter only.
3. **Media policy:** The recommended default is public read for assets referenced by published pages, with authenticated owner/admin/editor uploads and no anonymous uploads. Confirm whether any website assets need to remain private.
4. **Initial content scope:** The first migration should cover the current production landing page and its navigation, not unrelated social-AI/payment/admin content. Confirm if the other microsites or additional routes are also in scope.
