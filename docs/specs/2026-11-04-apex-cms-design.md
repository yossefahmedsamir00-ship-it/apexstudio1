# APEX STUDIO CMS & Site Motion Design

**Status:** Approved design draft for user review  
**Date:** 2026-11-04  
**Repository:** `yossefahmedsamir00-ship-it/apexstudio1`  
**Design branch:** `docs/apex-cms-design`

## 1. Goal

Make the existing APEX STUDIO website content-driven and fully manageable from the existing Flutter Admin application, while adding the requested sequential menu/page motion and subtle interaction effects. Preserve the current visual identity, customer workflows, payment flows, analytics, owner dashboard, and existing authentication boundaries.

This document describes the design only. It does not authorize production database changes, deployment, or implementation before the user reviews this document.

## 2. Repository facts and constraints

The design is grounded in the current `main` branch:

- The Vite website's production entry is `apex/src/main-production.tsx`. Projects, bilingual copy, services, process steps, and navigation are currently declared as in-file constants.
- `apex/src/lib/site.ts` already provides the `Locale`, `LocalizedText`, and `ProjectCard` types plus project filtering and inquiry validation. The CMS client should reuse compatible types or replace them through a deliberate migration, not create competing definitions.
- `apex/src/main-production.tsx` already adds `apex-reveal` classes and observes page elements with `IntersectionObserver`, with a reduced-motion fallback. The current `apex/src/styles.css` does not define the corresponding `.apex-reveal` rules, so the implementation should complete this mechanism rather than add a second observer.
- The existing navigation contains fixed links and a mobile menu. A configurable “More” menu with nested items is part of this change.
- `flutter_admin/lib/main.dart` contains the existing Supabase initialization, owner verification gate, repository, responsive admin shell, and Overview, Leads, Inbox, Payments, Activity, Security, and Controls pages. CMS features should be added as focused modules and new destinations while retaining those pages and existing owner checks.
- The current website admin entry `apex/src/admin.tsx` supports existing owner workflows such as inquiries, conversations, payments, events, security, and audit history. It is not the target CMS editor; Flutter Admin is.
- Supabase migrations live in `supabase/migrations/`. The current schema and access policies must be inspected before generating the CMS migration so that existing audit, owner, and security conventions are reused where appropriate.
- The website uses React, TypeScript, Vite, Supabase JS, and Vitest. Flutter Admin uses Flutter and `supabase_flutter`.

## 3. Chosen architecture

Use a small, versioned Supabase CMS with a typed JSON document model. Keep content editing and preview workflows in Flutter Admin. The public React website reads only published CMS revisions. Keep the current hardcoded content as a safe fallback until the CMS has been seeded and verified.

### 3.1 Content document model

Represent each independently publishable unit as a CMS document:

- `page`: a complete page document containing its ordered sections.
- `navigation`: a menu tree, including nested children and the More menu.
- `theme`: editable presentation settings that are intentionally exposed to the CMS.

Each document has one current draft revision and one published revision. Saving creates or updates a draft; publishing atomically moves the published pointer to the reviewed revision. Previous revisions remain available for history and rollback.

Recommended typed application contracts:

- `LocalizedText`: `{ en: string; ar: string }`.
- `SitePageDocument`: page identity and an ordered `sections: PageSection[]` collection.
- `PageSection`: stable ID, section type, enabled flag, display order, and typed localized content.
- `NavigationDocument`: ordered `MenuItem[]`; each item supports localized label, destination, visibility, and recursively nested children.
- `ThemeDocument`: only approved visual tokens and motion settings; no arbitrary executable CSS or JavaScript.
- `MediaAsset`: storage path, MIME type, dimensions, localized alt text, and timestamps.

Initial section types should cover the existing page: hero, statement, project grid, services, process, about, CTA, and footer. Shared text, image, and button blocks should be reusable inside supported sections. The schema should be extensible by adding a new typed section renderer, not by evaluating user-provided HTML or JavaScript.

### 3.2 Supabase data model

The migration should introduce the following CMS-owned tables (exact SQL names and constraints are to be settled against the live schema during implementation):

| Table | Responsibility |
|---|---|
| `cms_documents` | Document key/type and pointers to current draft and published revisions |
| `cms_revisions` | Immutable revision snapshots, JSON content, revision number, author, status, and publish metadata |
| `cms_media_assets` | Metadata and storage paths for uploaded images and other approved media |
| `cms_user_roles` | CMS administrator identity, role, and active state |
| `cms_audit_events` | Append-only record of CMS changes, publishing, role changes, and deletes |

Use Supabase Storage for media. Store media references by storage path/asset ID rather than embedding upload bytes in document JSON. Use soft-delete/archive semantics for CMS documents and media references when practical; actual Storage object deletion should follow a separate confirmation path so a content edit does not accidentally remove a file still referenced elsewhere.

### 3.3 Public website content flow

1. The React website requests the published page, navigation, and theme documents through the Supabase client.
2. RLS exposes only the currently published revisions to public visitors.
3. A typed mapper validates the returned document shape before rendering.
4. The site maps the content document to its existing section components.
5. If Supabase is unavailable, no CMS document is published, or the response cannot be safely parsed, the site uses the current built-in fallback content and records a non-sensitive diagnostic event where appropriate.

Do not block the first paint on optional CMS data. Cache the last successfully loaded published documents for the active browser session where appropriate, but never use a locally cached draft as public content.

### 3.4 Flutter Admin content flow

Add a CMS destination to the existing responsive admin navigation. The CMS area should contain:

- **Pages:** list pages, open a page, enable/disable sections, edit their contents, and reorder them.
- **Section editor:** edit Arabic and English copy, images, alt text, buttons, destinations, and supported block content.
- **Navigation:** manage primary links, the More menu, nested items, visibility, and order.
- **Media library:** upload, view, replace, and select stored assets.
- **Preview:** render the selected draft revision in an isolated preview surface before publishing. Preview must be clearly labelled as a draft and must not change the public published pointer.
- **Publish/history:** publish the selected revision, inspect prior versions, and restore a previous revision by creating a new publishable revision.
- **Administrators:** list CMS administrators and manage supported roles/status according to the caller's permission.

Keep the existing dashboard, inbox, payment, security, activity, and emergency controls working as they are.

### 3.5 Roles and authorization

Use three CMS roles:

- **Owner:** full CMS access, including managing administrator membership and roles.
- **Admin:** manage site content, media, navigation, and publish content; cannot grant or elevate another Owner.
- **Editor:** create and edit drafts and preview them; cannot publish or change administrator membership.

The existing owner verification gate remains in place. The server is authoritative for every privileged operation. Role membership must not be derived from editable `user_metadata` or a client-side flag. Use a database-backed role check with narrowly scoped RLS policies. Any Auth user invitation, deactivation, or role mutation must run through a server-side Edge Function that verifies the caller's current role and writes an audit event. Never place a Supabase secret/service-role key in React, Flutter, or a mobile build.

For policies that need a role-check helper, keep privileged helper functions in a non-exposed schema, explicitly check `auth.uid()`, restrict execution grants, and review the resulting policies with Supabase security advisors. Public reads and administrator writes must have separate policies. Updates must preserve both `USING` and `WITH CHECK` protections.

### 3.6 Draft, publish, and rollback behavior

- Saving a draft must not alter the public revision.
- Publishing must be an atomic server/database operation that verifies the caller can publish, verifies the target revision belongs to the document, changes the published pointer, and records the audit event.
- Failed saves or publish calls must leave the previous published revision unchanged and display a clear error in Flutter Admin.
- Rollback should never rewrite or erase old history. It creates a new revision using the selected historical content and publishes it through the same authorization path.
- A disabled section is preserved in the revision but omitted from public rendering.
- Deleting a document or removing media requires a confirmation step; referenced media must not be silently removed.

## 4. Motion and interaction design

Retain the existing APEX dark premium visual direction and current responsive layouts.

### 4.1 Sequential reveal

Complete the existing reveal observer/CSS contract. Use opacity and transform transitions, with short stagger delays for sibling cards and section children. Reveal each element once when it enters the viewport. Apply the same stagger behavior to the More menu and its nested items when the menu opens. Avoid animating layout dimensions or repeatedly observing elements after reveal.

### 4.2 Blur motion background

Add a restrained, low-contrast blurred background layer using a small number of decorative radial gradients. Animate only lightweight transforms/opacity; do not continuously animate expensive full-screen blur filters. The layer must be non-interactive and must not obscure readable text or focus outlines.

### 4.3 Button press feedback

On press, buttons should scale down very slightly and show a restrained glow matching the existing gold/blue palette. Release returns them to their original size. Keep existing hover and focus states, keyboard focus visibility, disabled states, and touch-friendly dimensions. Avoid excessive glow or movement.

### 4.4 Accessibility and performance

- Respect `prefers-reduced-motion: reduce`: reveal content immediately and disable non-essential motion, blur animation, and press transitions.
- Preserve a usable experience when `IntersectionObserver` is unavailable.
- Avoid motion that causes content to move under keyboard focus.
- Keep the decorative layer out of pointer and accessibility interaction.
- Ensure animations do not delay navigation, form submission, payments, or page content.
- Do not require a video or canvas background.

## 5. Error handling and operational behavior

- Public CMS fetch failure: render fallback content without a blank page or uncaught React error.
- Malformed or unknown section type: skip only that section, report a safe diagnostic, and render the remaining valid sections.
- Admin write failure: preserve the unsaved editor state and show the error; do not report success until Supabase confirms the write.
- Lost connection during publish: reload the document state from the server before allowing a retry, so the UI cannot claim a publish that did not happen.
- Permission denial: do not optimistically change role, published state, or navigation visibility.
- Missing media: show an editor placeholder in the CMS and a safe image fallback on the public site.
- Audit history: record actor, action, target, time, and limited metadata; never store passwords, access tokens, or secret keys.

## 6. Implementation boundaries and proposed file responsibilities

Observed paths are marked **existing**. New paths are **proposed** and should be reconciled with the repository before creation.

| Path | Responsibility |
|---|---|
| **Existing** `apex/src/main-production.tsx` | Load published content and bind it to existing public sections |
| **Existing** `apex/src/lib/site.ts` | Shared site types and existing pure helpers; evolve into shared CMS-facing types only as needed |
| **Existing** `apex/src/styles.css` | Complete reveal CSS and implement motion/press effects |
| **Proposed** `apex/src/cms/types.ts` | Typed CMS document, section, menu, theme, and media contracts |
| **Proposed** `apex/src/cms/repository.ts` | Fetch only published CMS documents and parse safe content |
| **Proposed** `apex/src/cms/fallback.ts` | Current static project/copy/services/process values as fallback seed content |
| **Proposed** `apex/src/cms/types.test.ts` and `repository.test.ts` | Validate schema handling, unknown section behavior, and fallback paths |
| **Existing** `flutter_admin/lib/main.dart` | Preserve app initialization/auth gate and connect CMS destination |
| **Proposed** `flutter_admin/lib/cms/` | Focused CMS models, repository, editor pages, navigation editor, media library, preview, and history screens |
| **Proposed** `supabase/migrations/<generated_timestamp>_apex_cms.sql` | CMS tables, constraints, indexes, grants, RLS, helper functions, and initial published seed content |
| **Proposed** `supabase/functions/apex-cms-admin/index.ts` | Secure invitations, role changes, deactivation, and other Auth Admin operations |
| **Proposed** `supabase/functions/apex-cms-admin/` tests | Authorization and privileged-action tests using the existing Edge Function test conventions |

The existing website admin `apex/src/admin.tsx` remains dedicated to the existing owner operations unless repository review reveals a direct integration need.

## 7. Verification and acceptance criteria

### Website

Run from `apex/`:

- `npm test`
- `npm run build`

Acceptance:
- The website renders the same current content from the initial seeded published CMS documents.
- Public visitors cannot read drafts or unpublised revisions through the Data API.
- The fallback renders the existing page when Supabase is unavailable or returns malformed content.
- Arabic/English switching works for all CMS-managed text and menu labels.
- Project filtering, inquiries, AI chat, direct owner chat, analytics, and payments remain unchanged.
- The reveal effect works once per element, the More menu and its children reveal sequentially, background motion is restrained, and button press feedback works.
- Reduced-motion mode disables non-essential motion without hiding or delaying content.

### Flutter Admin

Run from `flutter_admin/`:

- `flutter analyze`
- `flutter test`
- `flutter build apk --debug`

Acceptance:
- Existing owner login and all current dashboard destinations continue to work.
- Owner/Admin/Editor permissions are enforced by the backend, not only by widget visibility.
- Authorized users can edit page sections, bilingual content, images, buttons, navigation trees, and ordering.
- Editor can save and preview a draft but cannot publish.
- Admin can publish but cannot manage Owner membership.
- Owner can manage administrator membership and roles.
- Failed save/publish actions preserve the draft in the editor and leave the currently published site unchanged.
- History and rollback create an auditable new revision.

### Supabase

- Review all exposed tables for RLS and least-privilege grants.
- Test anon reads against draft and published documents.
- Test authenticated roles against every content operation.
- Test unauthorized and stale-session role changes.
- Test Storage upload, read, replacement, and deletion policies.
- Run Supabase security advisors and resolve material findings before production rollout.

## 8. Rollout and safety

1. Inspect the current database schema, RLS policies, owner bootstrap function, Edge Function conventions, and Storage buckets before writing the migration.
2. Build the CMS schema and role enforcement in a non-production validation environment or controlled test path.
3. Seed CMS documents from current website constants and compare the rendered result against the existing website.
4. Add Flutter CMS workflows and test each role with separate accounts.
5. Enable the public CMS read path only after seeded content and fallback behavior pass tests.
6. Keep existing production content and workflows available until the CMS has passed verification.
7. Apply production migrations or deploy Edge Functions/site builds only after the user separately authorizes production rollout.

## 9. Out of scope

- Replacing the current website framework or rebuilding the existing site from scratch.
- Replacing the existing owner authentication system.
- Changing payments, pricing, customer chat, inquiries, or analytics behavior.
- Arbitrary code/HTML/CSS/JavaScript injection through the content editor.
- Automatically deploying website changes whenever an editor saves a draft.

## 10. External references

Supabase security and Storage behavior must be verified against current documentation during implementation:

- [Supabase: Securing your data](https://supabase.com/docs/guides/database/secure-data)
- [Supabase: Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys)

---

## Review checklist

- [ ] The data model and revision-based publishing flow match the intended CMS.
- [ ] Owner/Admin/Editor permissions match the intended management model.
- [ ] Flutter Admin is the main content editor.
- [ ] Public content uses published revisions with a hardcoded fallback.
- [ ] Preview is a draft-only view and cannot modify public content.
- [ ] The requested sequential reveal, More menu stagger, blur motion, and button press effect match the desired visual behavior.
- [ ] Existing site features and production safety boundaries are preserved.
