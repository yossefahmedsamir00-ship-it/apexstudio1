# Vanilla Website Quality Pass — 2026-11-09

## Scope
This pass is limited to the isolated `apex/vanilla/` website on `feature/vanilla-website-migration`. The root public entry point, admin, payment, Social AI, Flutter applications, Supabase schema, Edge Functions, RLS, and production deployment workflow were not changed.

## Confirmed fixes and implementation
1. **Inquiry email validation.** Corrected escaped regular-expression metacharacters that rejected normal email addresses.
2. **Project filtering.** Missing or non-array CMS tags are treated as an empty list.
3. **Stylesheet integrity.** Replaced literal escaped newline sequences with real stylesheet line breaks.
4. **Browser storage resilience.** Added guarded storage helpers plus an in-memory fallback, and reused those helpers for Supabase auth storage, locale, analytics session, and conversation IDs.
5. **RTL direction.** Corrected selectors to use `html[dir="rtl"] body`, matching the app's document-level direction updates.
6. **Analytics payload parity.** Project IDs are now mapped to the dedicated `p_project_id` RPC argument instead of being left inside metadata.
7. **Supabase CMS reads.** Published project and service rows are loaded from `apex_site_content`; drafts remain excluded by the query and existing RLS. Curated content is retained as fallback because the table currently has zero rows.
8. **CMS detail routes.** Separate project and service detail pages load only a matching published row with the expected content type. Dynamic copy uses text nodes; external media and live links are accepted only when they use HTTPS.
9. **Standalone pages.** Added independent About, Services, and Work pages, using the same language, styling, CMS mappers and fallback data as the homepage.
10. **Assistant parity.** Added support/technical modes, transcript copy, older-message pagination, and conversion of the visible saved transcript into the existing project inquiry flow.
11. **Mobile navigation.** Added a working mobile menu to every standalone page, including project and service detail routes. A specificity conflict for detail-page menu visibility was corrected.
12. **Payment information.** Restored the informational methods/disclaimer section. No direct payment processing or provider configuration was added.

## Regression coverage
- Valid email acceptance and malformed/whitespace email rejection.
- Short project brief and missing consent rejection.
- Project filtering with missing tags.
- Safe storage read/write/remove when storage is blocked.
- Analytics mapping of project IDs to the dedicated RPC argument.
- CMS project mapping, localization, fallback behavior, and detail-route marking.
- CMS service mapping, missing-title filtering, and detail-route marking.
- Chat transcript formatting, empty-message handling, and older-history cursor behavior.

## CI evidence
GitHub Actions workflow `Validate APEX website migration`, run **#147**, completed successfully for commit `b623f52b64f9a0374b90477532c93f754e145790`.

Verified steps:
- Dependency installation — success.
- Vanilla JavaScript syntax checks for `app.js`, `project.js`, and `page.js` — success.
- Full Vitest suite, including existing application tests and vanilla tests — success.
- Vite production build for all configured entry points — success.

Prior meaningful red-green test cycles were observed for safe storage, chat transcript/history helpers, project CMS routing metadata, service CMS routing metadata, and analytics project ID mapping. The failures were corrected without removing or weakening the assertions.

## Supabase contract observations
- Read-only inspection confirmed the `apex_site_content` CMS table and public read policy restricted to `status = 'published'`.
- A read-only aggregate query on 2026-11-09 returned no rows for the CMS table. The public site therefore currently uses curated fallback projects and services.
- No live inquiry, anonymous chat, owner-chat, or analytics write was submitted during this pass. Those end-to-end flows remain unverified.

## Remaining release gates
- Browser/device QA at mobile, tablet, and desktop sizes.
- Visual parity review against the existing React implementation in English LTR and Arabic RTL.
- Real Supabase smoke tests for inquiry, visitor AI chat, owner chat, analytics, and CMS reads, using a controlled test record and account.
- Keyboard/accessibility review and measured Core Web Vitals.
- Final review of contact destinations, SEO metadata, and navigation behavior.
- Keep the root `apex/index.html` on React until parity is reviewed; do not merge or deploy until the release gates are satisfied.
