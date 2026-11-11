# APEX STUDIO — Vanilla public website

This directory contains the isolated HTML/CSS/JavaScript public-site rebuild. It is intentionally separate from the current React production entry while behavior parity is reviewed.

## Stack

- Semantic HTML
- CSS with responsive layouts, RTL/LTR rules, keyboard focus states, and reduced-motion support
- Browser JavaScript ES modules
- Existing `@supabase/supabase-js` package for the public Supabase client
- Existing Supabase RPC and Edge Function contracts; no new backend API is introduced

## Local development

From the `apex/` directory:

```bash
npm ci
npm run dev
```

Open the vanilla home page at `/vanilla/` (Vite serves `vanilla/index.html`). Dedicated pages are `/vanilla/about.html`, `/vanilla/services.html`, and `/vanilla/work.html`. Published CMS services and projects open `/vanilla/service.html?slug=<slug>` and `/vanilla/project.html?slug=<slug>`.

Set the same public Vite environment variables already used by the existing site in a local, untracked `.env.local` file:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The visitor AI chat uses the existing `apex-client-chat` Edge Function. Inquiry and analytics use the existing `capture_project_inquiry` and `capture_site_event` RPCs. Never put service-role, AI-provider, or payment secrets in this file or any browser bundle.

## Checks

```bash
node --check vanilla/app.js
node --check vanilla/project.js
node --check vanilla/welcome-intro.js
node --check vanilla/welcome-intro-core.js
node --check vanilla/scroll-mascot.js
node --check vanilla/page.js
npm test
npm run build
```

A dedicated GitHub Actions workflow runs these checks for the migration branch and pull requests.

## Current scope

Implemented in this isolated phase:
- Responsive black/gold home page and mobile navigation
- Arabic/English locale switching with document direction and safe storage fallback
- Project category filters, keyboard-accessible project cards, and inquiry prefill
- Service, process, about, payment-information, and CTA sections
- Published CMS project/service loading from `apex_site_content`, falling back to curated showcase content when no published records exist
- Dedicated standalone About, Services and Work pages
- Dedicated CMS-backed project and service detail routes at `project.html?slug=<slug>` and `service.html?slug=<slug>`; only published records are addressable
- Inquiry validation and existing `capture_project_inquiry` RPC submission
- Visitor AI chat with support/technical modes, suggested prompts, saved history, older-message pagination, transcript copy, and conversation-to-project-brief conversion
- Separate direct client-to-owner chat using the existing `apex-client-chat` open/send/read contract and `mode: "owner"`
- Analytics event capture with the project id mapped to the dedicated RPC argument
- Reduced-motion support, focus states, and safe handling when browser storage is unavailable
- Lightweight CSS-based immersive showroom with pointer parallax, responsive founder contact card, keyboard-accessible enter/exit controls, and Escape-key exit
- Cinematic first-visit welcome layer with animated CSS mascot study, gold/blue orbital lighting, localized welcome captions, optional browser speech synthesis, replay/skip/enter controls, and reduced-motion bypass
- Welcome intro is session-scoped and does not run again after dismissal in the same tab; speech availability depends on browser voice support and autoplay policy
- The current mascot is a CSS character study/prototype, not the final rigged 3D character.
- A lightweight persistent mascot prototype is also mounted on the home page; it responds to scroll progress and the currently visible section, with passive scroll listeners, requestAnimationFrame updates, and reduced-motion support. A production-quality animated 3D character with facial/lip-sync animation requires a separately created and optimized rigged GLB/GLTF asset
- Shared bilingual copy modules for the homepage, standalone pages, and project/service detail pages
- Browser smoke tests for homepage boot, language direction, assistant mode and opening, immersive showroom exit, all standalone page entry points, and bilingual detail not-found copy
- Chat history pagination preserves chronological order when inserting older server-ordered messages
- Visitor and owner chat restore the unsent message and remove the optimistic bubble after a send failure

CMS detail-page body fields currently supported:
- Localized text: `title_en`, `title_ar`, `summary_en`, `summary_ar`
- Project/service metadata: `category`, `mark`, `tags`, `client`, `year`
- Optional sections: `overview`, `challenge`, `approach`, `solution`, `results`, `features`, or `details` array with localized `title` and `description`
- Optional HTTPS media/links: `cover_image_url` / `cover_url`, `gallery` array, `project_url` / `live_url`, and `service_url` for service detail pages
- Optional project preview: `preview_url` (HTTPS only) and `demo_mode` (boolean). The preview is embedded in a restricted sandbox without same-origin access or form submission permission; some third-party sites may refuse iframe embedding. The separate live-project link remains available through `project_url` / `live_url`.
- Only HTTPS external links and images are rendered by detail pages

Current CMS data state verified on 2026-11-09:
- `apex_site_content` returned zero rows across content types and statuses, so the public site currently uses its curated fallback projects and static service content until the owner publishes CMS records.

Not yet accepted as production parity:
- Browser/device QA in real browsers, accessibility audit, real Supabase submission/chat smoke tests, and measured Core Web Vitals
- Full rendering of every optional CMS field and full comparison against every existing React interaction
- Switching the root `apex/index.html` entry point

Do not switch the root public entry, merge the migration, or deploy until the parity checklist is complete and reviewed.
