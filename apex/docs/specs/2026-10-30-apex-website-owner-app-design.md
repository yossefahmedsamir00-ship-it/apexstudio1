# APEX STUDIO Website + Owner Admin App — Product Design

**Status:** Design draft for owner review  
**Target branch:** `feature/flutter-admin-app`  
**Existing backend:** Supabase project `dyoaiszrmfrdxgouzgzq`

## 1. Product decision

Build one connected APEX STUDIO system with:
- A public customer website.
- One private Flutter mobile application for the APEX STUDIO owner only.
- One Supabase backend shared by both clients.

There is no separate customer mobile application. Customers use the website; the owner uses the Flutter app.

## 2. Product goals

1. Convert website visitors into complete, contactable project inquiries.
2. Keep every customer's private conversation separate and persistent.
3. Give the owner a reliable mobile workspace for inquiries, chat, payments, files, and business activity.
4. Use AI to prepare useful recommendations and drafts while keeping every external action behind explicit owner approval.
5. Preserve existing customers, payments, authentication, security controls, and deployed website behavior during incremental development.

## 3. Visual and interaction direction

- Premium, bespoke APEX identity: graphite/black foundation, gold highlights, electric blue, restrained fiery red.
- Avoid generic dashboard or AI-template styling.
- Use staggered entrance motion: elements fade in with a subtle vertical slide and sequential delays.
- Use smooth but restrained transitions; honor reduced-motion preferences and avoid expensive continuous effects.
- Chat should feel polished: distinct client/owner/AI/system message treatments, readable timestamps, delivery/read states where supported, attachment previews, voice-message controls, and clear conversation status.
- Wide layouts: conversation list beside the selected conversation. Mobile: conversation list, then a full-screen conversation with a back action.
- Inbox filters: all, unread, new customers, important. Search by customer name, phone, or message text; sort newest first; show unread counts and starred conversations.
- Support Arabic/English and RTL/LTR with a persistent language preference.

## 4. Website customer journey

1. Visitor explores the public APEX website, services, and portfolio.
2. Visitor opens a project request or customer chat.
3. Before a request is accepted, collect the customer's name, phone, email, and request details. Do not accept incomplete submissions.
4. Verify both email and phone before treating the customer/request as verified. The UI must show clear pending, verified, expired, and failed states.
5. On successful submission, create or associate the inquiry and its private conversation; show a truthful confirmation and reference.
6. Customers can exchange messages and supported attachments through the website. Each customer/conversation must remain isolated from every other customer's data.
7. Existing payment checkout remains linked to its inquiry/conversation; payment success is shown only after trusted provider confirmation.

## 5. Owner Flutter application

### Dashboard
- Show available metrics: visitors, inquiries, customers, unread messages, payment totals, paid/pending/failed payments, and recent activity.
- Distinguish unavailable metrics from zero; do not fabricate visitor counts or revenue.
- Provide date-range context and clear loading/empty/error states.

### Inbox and customer records
- One private thread per customer/conversation.
- Search, filters, unread counters, newest-first sorting, important/starred conversations.
- Text messages, supported image/file attachments, and voice messages with duration, playback, and cancel-before-send.
- Message history, timestamps, message status where reliably available, and clear sending/failure retry states.
- Customer profile includes contact details and verification state/history.

### Requests, payments, and activity
- Review and update inquiry status.
- Link inquiries, conversations, and payment orders without losing existing relationships.
- Show provider-confirmed payment status and a traceable activity history.
- Surface actionable errors and security events to the owner without exposing internal secrets.

### AI assistant
- AI may summarize conversations, classify/route suggested tasks, analyze uploaded material, and draft replies in the APEX tone.
- The assistant presents constrained, explicit choices for suggested next steps rather than open-ended autonomous actions.
- Sending a message, changing customer data/status, issuing payment actions, or performing any external side effect requires a separate explicit owner approval.
- Show the exact proposed action and its target before approval; record approval, rejection, actor, and result.
- AI drafts are visibly labeled as drafts and never appear as sent messages until the owner approves sending.

### File analysis
- Allow supported image and document uploads from the owner app and customer website.
- Associate files with the correct customer/conversation/inquiry.
- AI may extract visible brand elements such as logo, colors, and document requirements, and return a summary.
- Enforce server-side file size/type limits, private storage access, and safe download links. Do not execute uploaded files.

### Notifications
- New inquiries, customer messages, payment status changes, and important security events should reach the owner.
- Avoid duplicate notifications and provide in-app unread state.
- Background/closed-app push delivery depends on selecting and configuring a push provider and platform credentials; do not promise it until verified.

## 6. Existing implementation and constraints

Observed repository structure on `feature/flutter-admin-app`:
- Website entry: `apex/index.html`, Vite/React entry referenced as `/src/main-production.tsx`.
- Existing website scripts/styles include `apex/app.js`, `apex/src/styles.css`, and `apex/styles.css`.
- Flutter owner app: `flutter_admin/lib/main.dart`; package manifest: `flutter_admin/pubspec.yaml`.
- Existing backend functions: `supabase/functions/apex-client-chat`, `apex-ai-gateway`, `apex-owner-bootstrap`, and Kashier payment functions.
- Existing migrations include chat core, payments, inquiry/chat linking, rate limits/audit, and owner lockdown.

Architecture decision: Supabase is the active backend. Older documents under `apex/docs` mention Firestore/Firebase and must be reconciled with the actual Supabase implementation before they are treated as authoritative.

Preserve existing Supabase owner verification, RLS, validated Edge Function access, rate limiting, audit/security events, payment webhook verification, and the rule that service-role/secret keys never enter website or Flutter client builds.

Do not replace the existing production branch or merge this feature branch without a separate release review.

## 7. Proposed delivery slices

1. **Foundation and contract alignment:** reconcile docs with Supabase, map current schema/function contracts, define customer identity and verification lifecycle, and add focused tests before changes.
2. **Website intake and identity:** required contact/request details, email and phone verification flow, inquiry/conversation association, customer-facing errors and success states.
3. **Owner app dashboard and inbox:** polished responsive inbox, search/filters, customer profile, realtime refresh, and message state.
4. **Chat media and voice:** private file storage, metadata, image/document preview, audio upload/playback, validation, and failure/retry paths.
5. **Analytics and notifications:** trustworthy event definitions, owner metrics, in-app notifications, and configured push delivery.
6. **AI assistant and approvals:** task suggestions, file analysis, reply drafting, approval/rejection flow, audit trail, and no autonomous side effects.
7. **Hardening and release:** RLS/security review, regression tests, accessibility/reduced-motion, performance, APK build, and staged website release.

Each slice is delivered and verified independently. No destructive schema changes or production rollout without a reviewed migration and explicit release checkpoint.

## 8. Acceptance criteria

- Customer request submission is blocked until all required fields are present and both contact channels have verified status.
- A customer cannot read or modify another customer's conversation, inquiry, files, or payment data.
- The owner app remains inaccessible to non-owner accounts, enforced server-side.
- New customer messages and requests appear in the owner's inbox with correct customer association.
- Search, filters, unread counts, important markers, and mobile/large-screen layouts behave consistently.
- Voice and file uploads have clear progress, validation, playback/preview, and failure states.
- AI never sends messages or performs external actions without explicit owner approval.
- Dashboard numbers are backed by defined source events/queries and never presented as invented estimates.
- Existing payment verification, audit logging, emergency lockdown, and current data remain intact.
- Automated tests and release build pass before deployment.

## 9. Decisions still required before implementation

1. **Phone verification provider:** choose an SMS/WhatsApp OTP provider and confirm account/API configuration. Supabase email OTP can be evaluated for email; phone delivery cannot be assumed without a configured provider.
2. **Push delivery:** choose whether to configure Firebase Cloud Messaging for Android push notifications, or launch first with in-app notifications only.
3. **Analytics privacy:** decide whether to count anonymous page visits, which events to retain, and the retention period; present a privacy notice and consent behavior where required.
4. **Upload policy:** approve maximum file size and accepted formats for customer uploads and owner uploads separately.
5. **AI provider and budget:** confirm the provider/model and usage budget before enabling paid AI calls in production.
6. **Website hosting and release:** confirm whether the current GitHub Pages deployment remains the production target for the first release.

## 10. Non-goals for this delivery

- A separate customer mobile app.
- Autonomous AI sending or changing customer/payment data.
- Public exposure of private conversations, customer files, payment payloads, or owner analytics.
- Replacing the current payment provider or owner authentication without a separate approved design.
- Claiming background push, SMS verification, or email delivery is operational until the provider is configured and end-to-end tested.
