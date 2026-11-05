# APEX STUDIO — Flutter Web + Flutter Admin CMS Implementation Plan

## Approved architecture

- Public website: the existing `apex/` Flutter + Dart application, built for Flutter Web (and its supported mobile/desktop targets). Do not migrate the public experience to React or a separate vanilla-JS application.
- Owner application: the existing `flutter_admin/` Flutter + Dart app.
- Shared backend: the existing Supabase project and existing authenticated Edge Functions/tables where appropriate.
- Existing React-based admin, payment, and social AI entry points remain separate unless a focused compatibility change is required.

## Guardrails

- Work on `feat/static-website-flutter-cms`, based on the reviewed PR #18 head; do not rewrite or discard that work.
- Do not merge, deploy, change Auth provider settings, or apply migrations to Production in this implementation pass.
- Never expose service-role credentials or private owner data in browser code.
- Keep the current project inquiry, payment, and client-chat flows compatible.
- CMS content must be owner-authorized on the server/database; public visitors may only read published content.
- Do not claim push notifications while the app is closed unless a real push-delivery service is configured and tested.

## Phase 1 — Public Flutter Web experience

1. Treat `apex/lib/main.dart` as the public website source of truth and build it with Flutter Web. Keep React/Vite entry points only for the separately scoped legacy admin/payment/social surfaces; do not use them for the public website.
2. Preserve the approved APEX visual direction in Flutter: graphite/black, gold, electric blue, restrained red, responsive layouts, subtle motion, and accessible motion behavior.
3. Complete the public Flutter experience: project filtering and detail view, Arabic/English toggle with RTL/LTR, durable project inquiry form, client AI chat entry, payments navigation, section navigation, and analytics event capture.
4. Use existing Supabase client/backend contracts; do not invent table names or bypass validated RPC/Edge Function boundaries.
5. Keep admin/payment/social entry pages working as separate build inputs.

Acceptance:
- Public `index.html` contains no React root or TSX module.
- No React/ReactDOM imports or framework runtime are used by the public page.
- Project filters, modal, locale direction, form validation, and mobile navigation work.
- Request success is shown only after the backend confirms persistence.
- Reduced motion is respected; no forced animation for users who disable it.

## Phase 2 — Flutter CMS persistence

1. Inspect existing public schema, migrations, owner verification, RLS, and existing admin repository contracts before selecting a persistence model.
2. Add tests for repository behavior before implementation.
3. Replace local-only CMS state with a typed repository backed by an owner-authorized Supabase interface.
4. Support load, create, edit, draft/publish state, preview, and safe error/loading states.
5. Ensure public website reads only published content; draft content stays private to the owner.
6. If a schema migration is needed, add a reviewed migration file and SQL security tests; do not apply it to Production.

Acceptance:
- CMS edits persist across app restarts after successful save.
- Failed writes do not show a success state or discard the user's input.
- Non-owner sessions cannot read or mutate CMS content.
- Public role cannot read drafts or write content.
- Tests cover repository success/failure and access boundaries.

## Phase 3 — Background push notifications for Flutter Admin

1. Add explicit notification-permission onboarding and a settings screen for enabling/disabling alerts.
2. Integrate Firebase Cloud Messaging for Android/iOS, including foreground presentation and notification-tap routing into the correct conversation.
3. Register per-device FCM tokens only after server-side owner verification; support token refresh, logout cleanup, and multiple devices.
4. Store tokens in a dedicated table with strict owner-only RLS; never accept arbitrary user IDs from the client.
5. Send pushes from a Supabase Edge Function/server-side sender after a new client message is durably stored. Never put FCM service-account credentials in Flutter or website code.
6. Keep notification previews privacy-aware (generic text by default; avoid exposing full private message bodies on lock screens).
7. Test foreground, background, terminated-app, permission-denied, token-refresh, duplicate-delivery, and notification-tap flows on a physical Android device; test iOS when Apple/Firebase app configuration is available.

Acceptance:
- Owner can grant or deny notification permission; the app explains how to enable it later.
- A new client message produces a push while the app is backgrounded or terminated, after provider configuration is complete.
- Tapping the push opens the matching conversation after owner access is revalidated.
- A denied permission or missing provider configuration fails gracefully without blocking login or messages.
- Push sender credentials remain server-only; RLS prevents clients from listing or modifying arbitrary device tokens.

External setup required before live delivery:
- Firebase project with Android package `com.apexstudio.apex_studio_admin` (confirm actual applicationId from generated Gradle config) and iOS bundle ID.
- Android `google-services.json` and iOS `GoogleService-Info.plist` supplied through secure CI/release configuration, not committed as secrets.
- Firebase service account credentials stored only as Supabase Edge Function secrets.
- Apple APNs authentication key/certificate linked in Firebase for iOS delivery.

## Phase 4 — Quality, security, and delivery

1. Update GitHub Actions so the public site is built as static assets and Flutter Admin is analyzed/tested/built independently.
2. Keep existing payment/social/admin build inputs functional.
3. Run available unit tests, Flutter analyze/tests, production build, and workflow checks.
4. Review diffs for accessibility, RTL, performance, secrets, RLS, and regressions.
5. Open a draft PR with exact verification results and manual test instructions.

## Initial verification evidence

- PR #18 head at planning time: `49784f616835ab6017f8d3a7b8bd80584f6c4eda`.
- Existing Flutter Web CI run `41991501859`: success.
- Existing Flutter Admin CI run `41991501740`: success.
- The existing public page currently loads `/src/main-production.tsx`; the legacy `app.js` is a separate minimal prototype and is not feature parity.
- The current Flutter CMS is local/demo-only and explicitly states that drafts are not persisted to the server.

## Open implementation constraints

- Supabase schema currently has inquiry/chat/payment/security data but no confirmed public CMS content tables. Re-check current migrations and live schema before designing a CMS table.
- Google/Apple OAuth provider setup and push delivery remain separate release configuration tasks.
