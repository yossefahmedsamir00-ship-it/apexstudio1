# APEX STUDIO — Current Application

APEX STUDIO is an active Vite + React + TypeScript website backed by Supabase. This README describes the implementation currently in the repository; it replaces the older Firebase/Firestore-only blueprint.

## Application surfaces

- `index.html` → public APEX STUDIO website (`src/main-production.tsx`)
- `admin.html` → private web owner dashboard
- `payment.html` → hosted invoice/payment experience
- `social-ai.html` → Social AI workspace
- `flutter_admin/` at the repository root → separate Flutter owner application

The `apex/lib/` directory is a separate Flutter application and APEX FLOW integration. Its GitHub Pages workflow is not the Vite website deployment.

## Runtime architecture

- Frontend: React, TypeScript, Vite
- Authentication and data: Supabase Auth + Postgres/RLS
- Server-side operations: Supabase Edge Functions and validated RPCs
- Payment flow: Kashier hosted checkout with server-side webhook reconciliation
- AI requests: server-side APEX AI gateway; provider secrets must never be placed in browser environment variables

The browser uses only the Supabase project URL and publishable key. Service-role keys, payment secrets, AI provider keys, and webhook secrets must remain in Supabase Edge Function secrets.

## Local development

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set the real Supabase URL and publishable key in `.env.local`.
4. Run:

```bash
npm ci
npm run dev
```

Verification:

```bash
npm test
npm run build
```

The build output is `dist/`. Do not commit `.env.local` or any secret values.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |

See `.env.example` for placeholders only. Do not add a service-role key to any `VITE_*` variable.

## Hosting and deployment

- `firebase.json` configures Firebase Hosting to serve the Vite `dist/` folder.
- A Firebase project alias is not committed in this repository. Confirm the intended Firebase project before deploying.
- `.github/workflows/apex-website-ci.yml` runs `npm ci`, the Vitest suite, and a production Vite build.
- `.github/workflows/deploy.yml` is for the separate Flutter app under `apex/lib/`; it does not deploy this Vite website.

No production website deployment is performed by the website CI workflow.

## Supabase production

The production Supabase project is managed separately from the browser build. Apply database migrations and deploy Edge Functions only after checking the target project, migration history, function version, and security review. The owner dashboard and public website must never receive service-role credentials.

## Release checklist

- [ ] Configure `.env.local` locally and confirm the deployment environment has the same two public variables.
- [ ] Confirm the Firebase Hosting project/target before deployment.
- [ ] Run website tests and production build.
- [ ] Deploy reviewed Supabase migrations and Edge Functions.
- [ ] Verify owner login with the configured owner account and confirm non-owner access is rejected server-side.
- [ ] Test inquiry persistence and error handling against the live Supabase project.
- [ ] Verify Kashier sandbox checkout and signed webhook reconciliation before enabling live payments.
- [ ] Complete browser checks on mobile and desktop.

A green frontend build does not, by itself, prove that live authentication, payment processing, email delivery, or production hosting is configured.
