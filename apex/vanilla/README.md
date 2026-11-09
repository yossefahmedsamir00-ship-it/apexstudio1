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

Open the vanilla page at `/vanilla/` (Vite serves `vanilla/index.html`).

Set the same public Vite environment variables already used by the existing site in a local, untracked `.env.local` file:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The visitor AI chat uses the existing `apex-client-chat` Edge Function. Inquiry and analytics use the existing `capture_project_inquiry` and `capture_site_event` RPCs. Never put service-role, AI-provider, or payment secrets in this file or any browser bundle.

## Checks

```bash
node --check vanilla/app.js
npm test
npm run build
```

A dedicated GitHub Actions workflow runs these checks for the migration branch and pull requests.

## Current scope

Implemented in this isolated phase:
- Responsive black/gold landing page and mobile navigation
- Arabic/English locale switching with document direction
- Project category filters, accessible project detail dialog, and inquiry prefill
- Service, process, about, and CTA sections
- Inquiry validation and existing Supabase RPC submission
- Visitor AI chat using the existing `apex-client-chat` open/send/read contract
- Analytics event capture and reduced-motion support

Not yet accepted as production parity:
- Separate client-to-owner chat experience and complete parity with every existing React interaction
- Admin-managed live project content and separate project-detail routes
- Browser/device QA, accessibility audit, real Supabase submission/chat smoke tests, and measured Core Web Vitals
- Switching the root `apex/index.html` entry point

Do not switch the root public entry, merge the migration, or deploy until the parity checklist is complete and reviewed.
