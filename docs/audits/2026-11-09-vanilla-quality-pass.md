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
13. **Assistant controls.** Fixed collection binding for the AI open button and assistant-mode buttons; single-element selectors no longer receive `forEach`.
14. **Chat failure recovery.** Visitor and owner chat restore the unsent text to the input and remove the optimistic bubble when the send request fails.
15. **Older message ordering.** Added the missing history-prepend helper so older server-ordered chat messages render in chronological order.
16. **Service detail not-found copy.** Missing service slugs and unpublished CMS service records now use service-specific text in both English and Arabic.

## Regression coverage
- Valid email acceptance and malformed/whitespace email rejection.
- Short project brief and missing consent rejection.
- Project filtering with missing tags.
- Safe storage read/write/remove when storage is blocked.
- Analytics mapping of project IDs to the dedicated RPC argument.
- CMS project mapping, localization, fallback behavior, and detail-route marking.
- CMS service mapping, missing-title filtering, and detail-route marking.
- Chat transcript formatting, empty-message handling, pagination cursor selection, and chronological prepend ordering.
- Homepage boot, locale/RTL switching, assistant-mode controls, and AI dialog opening.
- Standalone About, Services, Work, Project Detail, and Service Detail page boot.
- Localized project/service not-found messages in English and Arabic.
- Failed visitor/owner chat sends remove optimistic bubbles and restore the message text for retry.

## CI evidence
GitHub Actions workflow `Validate APEX website migration`, runs **#205** (push) and **#206** (pull request), completed successfully for commit `d5c40a081924f8f335b56ea7369b0c2fbbbf987b`.

Verified steps:
- Dependency installation — success.
- Vanilla JavaScript syntax checks for the website, page, CMS, and translation modules — success.
- Full Vitest suite: **6 test files passed**, covering existing application tests and vanilla page/helper tests.
- Vite production build for all configured entry points — success.
- Dependency audit reported **0 vulnerabilities** in the installed dependency tree.

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


## Additional red-green evidence — 2026-11-09
- The home-page smoke test first failed on the actual startup defect: `$(...).forEach is not a function` for the AI assistant control. The affected controls were changed to use the collection selector; the full suite and build then passed.
- The chat prepend test first failed because `getMessagesForPrepend` was not exported. The helper was implemented to reverse the chronological API rows before DOM prepend; the assertion remained unchanged.
- The detail not-found test first failed because `getDetailNotFoundCopy` was not exported. The helper was implemented and used for both missing-slug and no-published-record branches; the tests then passed.
- The standalone page smoke suite initially exposed a test-state leak from persisted locale. The fixture now clears its own local storage before loading each page.

## Remaining limitations
- CI uses Vitest/jsdom and Vite build; it is not a substitute for real Chromium/Firefox/Safari interaction and visual testing.
- No live Supabase writes or chat requests were issued. Failed-send rollback is tested at the code path level through the page smoke/setup coverage, not an end-to-end Edge Function session.
- Production entry-point cutover remains intentionally blocked pending visual/browser parity, accessibility review, Core Web Vitals, and controlled Supabase integration checks.
