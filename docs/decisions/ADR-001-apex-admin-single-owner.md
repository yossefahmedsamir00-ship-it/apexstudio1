# ADR-001 — APEX Admin: Single Owner Account

- **Status:** Accepted
- **Decision date:** 2026-11-21
- **Scope:** APEX STUDIO private Flutter Admin application, Release 1

## Context

APEX STUDIO needs a private administration application that controls the website and its business workflows. The owner selected a single-owner model rather than a team or multi-user administration system.

## Decision

Release 1 of APEX Admin is restricted to **one owner account**.

- There is one configured owner identity with full administrative permissions.
- There is no public admin registration, staff invitation, employee account, or team-role management in Release 1.
- A valid authentication session alone does not grant admin access. The backend must independently verify the authenticated user against the configured owner identity.
- All privileged reads and writes must be authorized server-side; hiding admin screens or buttons is not an authorization control.
- Row Level Security and server-side authorization remain enabled. The Flutter app must never contain service-role keys, server secrets, or provider credentials.
- Public website visitors and customer accounts cannot access owner data or admin operations.
- Owner actions that change important business data must be auditable.

## Authentication and authorization

The Flutter Admin client uses the existing Supabase Auth flow and the server-side owner verification path documented in `flutter_admin/README.md`. The backend remains the source of truth for the owner identity and permission checks.

No client-supplied role, email-only comparison, locally stored flag, or UI state may grant owner privileges.

## Future extensibility

The data and service boundaries should avoid hard-coding authorization into individual UI widgets. This allows a future, separately approved release to add staff accounts and scoped roles without redesigning the entire application.

This future possibility does **not** authorize staff access, invitations, or additional administrator accounts in Release 1.

## Acceptance criteria

- Exactly one configured owner identity can enter the Admin application.
- Any other authenticated account is denied access to all admin data and operations.
- There is no public sign-up or staff invitation flow.
- Owner authorization is checked by the backend for every privileged operation.
- RLS and negative-permission tests verify that non-owner users cannot read or modify protected data.
- No service-role key or server secret is bundled in the Flutter application.
- Owner-only actions produce appropriate audit records.

## Related documentation

- `flutter_admin/README.md`
- `docs/APEX_SOCIAL_AI_SPEC.md`
- `docs/APEX_SOCIAL_AI_API_CONTRACTS.md`
