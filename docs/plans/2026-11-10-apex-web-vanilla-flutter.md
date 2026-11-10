# APEX STUDIO — Web + Flutter Application Architecture (2026-11-10)

## Decision recorded from owner brief

This plan supersedes the earlier assumption that the public website itself must be Flutter Web.

- **Public website:** semantic HTML + CSS + vanilla JavaScript (ES modules), optimized for low-end phones and desktop.
- **Web owner dashboard:** HTML + CSS + vanilla JavaScript, served as a separate protected route/page.
- **Mobile owner application:** Flutter + Dart in `flutter_admin/`. It is a real mobile app, not a WebView wrapper.
- **Shared backend:** the existing Supabase project, existing Edge Functions, PostgreSQL schema, Auth and RLS.
- **Grok AI:** accessed through a server-side gateway (verify the existing `apex-ai-gateway` contract before use). No Groq/Grok secret in browser or Flutter binaries.
- **No React for the APEX public site or web dashboard.** Existing React/Vite entry points are implementation material to inspect and migrate carefully; do not delete them until equivalent behavior and tests exist.

## Product goals

Build a premium, cinematic digital studio website and matching owner tools. The experience should feel distinctive and polished without sacrificing speed, clarity, accessibility, or reliability.

### Public website

1. Home / studio introduction with clear service positioning and contact CTA.
2. Services with real descriptions and useful detail.
3. Selected work / portfolio with category filters and search.
4. Dedicated project details when a project card is selected (not only a small alert/dialog).
5. Project detail content: purpose, problem, solution, what was built, features, technologies, preview/demo link, screenshots/media, and verified public outcome metrics where supplied.
6. Contact / project inquiry flow and existing AI chat entry.
7. Arabic RTL and English LTR.
8. Responsive behavior from 320 CSS px through wide desktop.
9. SEO, metadata, accessible semantics, keyboard navigation and reduced-motion support.

### Project details and financial privacy

- Public portfolio may show project facts and outcome metrics only when those facts are explicitly supplied and approved for public display.
- Cost price, internal expenses, revenue, margin, payment records, client private information, and internal performance notes belong only in owner-authorized web/mobile dashboards.
- Never infer or fabricate cost, revenue, number of users, visits, likes, or business outcomes.
- Separate public project content from private financial/operational records at the data and API boundary, not merely by hiding fields in the UI.

### Web owner dashboard

Protected owner-only web interface with modules for:
- Overview and verified analytics.
- Portfolio projects and project detail content (draft / preview / publish).
- Services and site content.
- Inquiries, clients and conversations.
- Payments and invoices (read/operate only through existing server-verified flows).
- Internal project cost / revenue / profitability, only if a verified data source and secure schema exist.
- Website activity and reports.
- Security events, audit trail and supported emergency controls.
- AI assistant using the server-side Grok gateway, with explicit server-side authorization and data scoping.

### Flutter mobile owner app

- Preserve the current Flutter + Dart owner app and its working modules.
- Provide equivalent core owner workflows where appropriate: dashboard overview, projects/CMS, inquiries, inbox/chat, payments, activity, security and AI assistant.
- Share backend contracts and authorization rules with the web dashboard; do not duplicate privileged logic in the clients.
- Adapt navigation and data density to mobile rather than shrinking the web dashboard onto a phone.

## Visual direction

- Base: graphite / near-black (#0A0A0A and #111214).
- Primary accent: APEX gold (#D7A83E); restrained electric blue for information/AI states; red only for destructive/security states.
- Premium display typography with readable Arabic and Latin fallbacks.
- Clear hierarchy, generous but controlled spacing, crisp borders, layered surfaces, and a single memorable signature visual.
- Motion should communicate hierarchy, continuity and feedback. Use one-by-one reveal for selected content with stagger caps; do not animate every element continuously.
- Respect `prefers-reduced-motion`; provide static equivalents.
- 3D is progressive enhancement, not a dependency of core navigation or content. Prefer CSS perspective/transforms for small decorative moments. Load a 3D/WebGL scene only after visibility and capability checks; on low-end devices, reduced-motion settings, WebGL failure, or constrained memory, show a lightweight poster/CSS fallback.

## Performance and device targets

- Treat entry-level Android phones (including the owner's Oppo A5) as a first-class target.
- Mobile-first layout, small initial JS payload, lazy-loaded routes/media, responsive images, system font fallbacks, no autoplay video, no large blocking 3D bundle.
- Avoid layout shifts; reserve image/media dimensions.
- Keep touch targets comfortable, forms simple, and dashboard tables replaced by compact cards or horizontal-safe layouts on narrow screens.
- Test at 320, 360, 375, 390, 768, 1024 and 1440 CSS px where applicable.
- For Flutter, test narrow phone widths, text scaling, long Arabic labels, keyboard visibility, safe areas, and scrolling. Fix overflow by design; do not suppress it with clipping that hides content.
- A claim of compatibility with the physical Oppo A5 requires a real-device test. Automated viewport tests alone do not prove physical-device performance.

## Security and data boundaries

- Public browser and Flutter clients may contain only the Supabase publishable key and other explicitly public configuration.
- Never ship service-role keys, secret API keys, payment secrets, Grok keys, FCM service-account JSON, or privileged tokens to clients.
- Owner dashboard access must be verified server-side (existing owner bootstrap contract); a hidden route or client-side role flag is not authorization.
- All exposed tables require RLS with least-privilege policies. Validate owner identity and record ownership on server-side operations.
- Financial data must be served only through an owner-verified query/function with narrow fields; no public policy or public view may expose it.
- Keep existing inquiry/chat/payment flows compatible. Payment status remains server/webhook-authoritative.
- Use audit events for privileged writes and sensitive actions.
- Do not apply migrations to production, change Auth provider settings, deploy Edge Functions, or deploy the website without separate explicit approval.

## Existing repository facts to preserve / verify

- `apex/index.html` currently mounts `src/main-production.tsx` (React).
- `apex/admin.html` currently mounts `src/admin.tsx` (React) and `src/owner-login-lock.ts`.
- `apex/package.json` currently includes React, Vite, TypeScript, Vitest, Supabase JS and Lucide React.
- `apex/lib/main.dart` is an existing Flutter public-site implementation; it is not the selected source of truth for the public web after this decision. Do not delete it until its useful flows and dependencies are accounted for.
- `flutter_admin/` is the existing Flutter owner application and already includes owner bootstrap, inbox, CMS, payments, site activity, security/audit and lockdown modules.
- The repository includes a CMS migration for `apex_site_content`; inspect the exact policies/schema before changing access or adding fields.
- Existing Edge Functions include owner bootstrap, client chat, AI gateway and Kashier payment flows. Verify exact contracts before calling them.
- PR #28 adds repository Agent Skills only; it is not the website implementation and must not be treated as the finished product.

## Implementation phases

### Phase 0 — Audit and contracts
- Inspect every current web entry point, owner login guard, Supabase client, CMS migration, Edge Function contract, and Flutter module.
- Record preserved behaviors and map each existing flow to its new vanilla-JS location.
- Confirm the current branch and avoid overwriting unrelated work.
- Add tests around critical existing flows before replacing their UI implementation.

### Phase 1 — Design system and public web foundation
- Create tokens, semantic page structure, reusable vanilla-JS modules and responsive navigation.
- Implement home, services, portfolio listing, search/filter, project detail route/view and inquiry entry.
- Preserve Arabic/English, RTL/LTR and accessible interactions.
- Add motion progressively and test reduced-motion and low-end fallbacks.

### Phase 2 — Web owner dashboard
- Replace React dashboard only after mapping and testing existing owner login, bootstrap, CMS, inbox, payment, analytics and security behavior.
- Build owner-only routes/modules in vanilla JS.
- Keep privileged writes behind existing Edge Functions/RPCs and verify authorization on the server.
- Do not expose financial data until a verified owner-only data contract exists.

### Phase 3 — Flutter owner application
- Audit existing Flutter pages and responsive constraints.
- Improve layouts, empty/loading/error states, navigation, animation and detail pages without adding heavy 3D by default.
- Add widget tests at representative narrow widths and text scales.
- Keep feature parity focused on mobile workflows.

### Phase 4 — Grok AI integration
- Verify current gateway's supported request schema and auth checks.
- Route chat through the server-side gateway; keep provider credentials server-only.
- Scope data access per role and per record. AI output is advisory and cannot execute sensitive actions without an explicit owner confirmation and server-side authorization.
- Provide loading, failure, rate-limit and unavailable states.

### Phase 5 — Security, performance and release
- Review RLS, Edge Functions, secrets, auth/session boundaries, payment flows, storage, logging and audit coverage.
- Run dependency and static checks, unit/component tests, web production build and Flutter analyze/test/build.
- Test responsive behavior and reduced motion; use physical-device testing for Oppo A5 before claiming device-specific compatibility.
- Open a draft PR with exact changed files, test results, screenshots/evidence and unresolved release gates.

## Acceptance criteria

- Website and web dashboard build without React runtime; HTML/CSS/vanilla JS are the web implementation.
- Flutter owner app remains Flutter/Dart and builds independently.
- Public visitors can view published projects and open full project details.
- Private cost/revenue/client data is never returned to public sessions.
- Owner login is server-verified; unauthorized sessions cannot access owner modules or data.
- No service-role/provider secrets appear in browser bundles, Flutter assets, source control or logs.
- Core public experience remains usable without WebGL/3D and with reduced motion enabled.
- No horizontal overflow at the required viewport widths; important content remains reachable at 320 CSS px.
- Flutter screens are tested for overflow, long text, keyboard and narrow widths; physical Oppo A5 test remains a separate release gate.
- All success claims are backed by executed tests/builds; unrun checks are clearly labeled.
