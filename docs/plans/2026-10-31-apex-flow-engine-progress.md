# APEX FLOW ENGINE implementation progress

Plan: `docs/plans/2026-10-31-apex-flow-engine-implementation.md`

## Implemented on this isolated branch

- Task 1 — Domain contracts, API envelopes, persistence schema, idempotent request intake fields, indexes, owner-consistent foreign keys, RLS/FORCE RLS, and client-role deny policies.
- Task 2 — Private owner-verified Edge Functions for request intake, operation/project/scene management, revision-bound approvals, publishing drafts, and manual finance records. Safe errors, correlation IDs, owner checks, audit events, and origin checks are included.
- Task 3 — React command center entry at `apex/flow-engine.html` with Arabic/English UI, command intake, operations, video project/scene planning, approvals, publishing drafts, and finance records.
- Task 4 — Flutter Admin integration reusing the existing owner session and Supabase client. The Flow Engine screen reads the same operations, projects, approvals, publishing drafts and finance records, and supports request intake and approval decisions.

## Verification

- Web: focused Flow Engine tests, complete Vite test suite, and `npm run build` passed in GitHub Actions.
- Edge Functions: Deno request contract tests and type-check passed for all Flow Engine functions.
- Database: migration applied successfully to a disposable PostgreSQL 17 CI service; RLS and client-role privilege assertions passed.
- Flutter: `flutter pub get`, `flutter analyze`, and `flutter test` passed in GitHub Actions.

## Not activated in the live environment

- The migration has not been applied to the live Supabase project.
- Flow Engine Edge Functions have not been deployed to the live Supabase project.
- No production web deploy, production Flutter release, or changes to `main` were made.
- AI execution, video rendering, social publishing, provider reconciliation, and always-on scheduling remain `not_configured`; no provider credentials or paid services were added.
- Finance records are manual only unless a trusted reconciliation connector is explicitly configured.

## Guardrails preserved

- Work remains on `docs/apex-flow-engine-design`.
- PR #11 was not modified or merged.
- `main` and production deployments were not changed.
- No paid services were added.
