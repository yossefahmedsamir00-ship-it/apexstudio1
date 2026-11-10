---
name: apex-supabase-security
description: "Use whenever APEX work touches Supabase Auth, PostgreSQL, RLS, Storage, Realtime, Edge Functions, database migrations, user data, or authorization. Do NOT use for Flutter-only presentation changes with no backend or data-access impact."
---

# APEX Supabase Security

## Purpose
Keep APEX's shared Supabase backend private-by-default and enforce authorization at trusted server/database boundaries.

## Required Workflow
1. Read the installed Supabase skill and verify current Supabase documentation for the exact feature/version before implementation.
2. Inspect the existing schema, migrations, Edge Functions, RLS policies, grants, and call sites. Do not assume table names or ownership rules from UI code.
3. Write down the actor, resource, allowed action, and ownership rule for each data operation.
4. Keep privileged credentials server-side. Never put service-role or secret keys in Flutter, web assets, logs, commits, or client configuration.
5. Treat every client parameter, uploaded file, redirect, and user profile field as untrusted. Derive identity from the verified auth context, not a caller-supplied user ID.
6. Enable RLS on exposed tables and write least-privilege policies. For UPDATE, verify both row visibility and post-update ownership with appropriate USING and WITH CHECK conditions.
7. Check views, RPCs, triggers, and SECURITY DEFINER functions for privilege escalation and unintended public execution.
8. For Storage, verify bucket visibility, object path ownership, MIME/size constraints, and every required policy.
9. Prefer additive, reversible migrations. Never disable RLS or modify production data/schema without explicit approval.
10. Test both allowed and denied cases using separate user identities where applicable. Include unauthenticated, wrong-owner, and malformed-input cases.

## Security Gate
- [ ] No secret or service-role credential reaches a client.
- [ ] Identity comes from verified auth context.
- [ ] RLS and grants match the intended access model.
- [ ] Cross-user reads/writes are denied.
- [ ] Edge Function errors do not leak tokens, secrets, or private records.
- [ ] Migration is reviewed and has a rollback/restore strategy.
- [ ] Verification evidence is recorded; untested claims are clearly marked.

## Stop Conditions
Stop before production migrations, destructive SQL, policy broadening, credential rotation, or live payment/auth configuration. Present the exact impact and request approval.
