---
name: apex-verify-delivery
description: "Use after APEX code, tests, configuration, or documentation changes when checking whether a task is actually complete, buildable, and safe to hand off. Do NOT use for initial brainstorming or read-only product discovery before any change exists."
---

# APEX Delivery Verification

## Workflow
1. Read `AGENTS.md` and identify the exact changed surfaces and expected behavior.
2. Discover the repository's actual package manager, Flutter/Dart version, scripts, and CI commands. Never invent commands.
3. Run the narrowest relevant tests first, then broader checks:
   - Flutter changes: formatter check, targeted Flutter tests, full relevant test suite, and Flutter Web build when applicable.
   - Supabase/Edge Function changes: available type/lint/tests plus security-focused authorization cases.
   - Documentation/skills changes: frontmatter and path checks, link/reference checks, trigger tests.
4. Inspect the final diff for unrelated edits, secrets, generated artifacts, accidental environment files, and changed public interfaces.
5. For UI changes, include manual test steps for phone and desktop, Arabic RTL and English LTR.
6. Record every command and its actual result. If a command could not run, state why and what remains unverified.
7. Never claim deployment, live auth delivery, real AI provider success, payment success, or production readiness unless that exact path was tested in the target environment.

## Completion Gate
A task is complete only when:
- Acceptance criteria are mapped to evidence.
- Relevant checks pass or blockers are explicitly listed.
- No secrets or unintended files are present in the diff.
- The handoff lists changed files, behavior, verification, and remaining user actions.

## Stop Conditions
Do not deploy, run destructive migrations, or change live credentials as part of verification without explicit approval.
