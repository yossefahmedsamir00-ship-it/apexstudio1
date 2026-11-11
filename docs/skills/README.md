# APEX STUDIO Agent Skill Registry

This registry lists the project-local workflows that Codex should use. It is intentionally curated: the repository contains the skills needed for the current APEX architecture, not a blind import of thousands of unrelated repositories.

## Local APEX skills

| Skill | Use for | Scope |
|---|---|---|
| apex-task-planner | Multi-file work, architecture, requirements, acceptance criteria | Planning across APEX |
| apex-vanilla-web | Public website pages, browser JavaScript, HTML/CSS, CMS display | apex/vanilla/ |
| apex-flutter-ui | Owner app screens, navigation, responsive Flutter UI, RTL/LTR | flutter_admin/ |
| apex-motion-system | Motion, transitions, scroll effects, reduced-motion, animation performance | Website and app motion |
| apex-supabase-security | Auth, RLS, SQL, Storage, Realtime, Edge Functions, user data | Shared Supabase backend |
| apex-ai-chat | AI chat, model routing, prompts, streaming, persistence | AI gateway and chat |
| apex-code-review | PRs, diffs, regressions, security and accessibility review | Read-only review |
| apex-verify-delivery | Tests, builds, diff inspection, release evidence | Delivery verification |

Each skill's full trigger, workflow, quality gate, and stop conditions live in .agents/skills/<name>/SKILL.md. AGENTS.md routes tasks to the relevant skill.

## Principles adopted from the broader skill ecosystem

- Planning and architecture: clarify outcomes, preserve existing stack/source of truth, define interfaces and acceptance criteria, and separate production decisions from implementation.
- Design systems: use shared tokens, consistent spacing/type/color, responsive layouts, keyboard focus, RTL/LTR, and verified rendered states.
- Motion: use motion to communicate hierarchy and state; prefer transforms/opacity; respect reduced-motion; keep low-end mobile usable.
- Engineering: cohesive modules, narrow interfaces, tests at public seams, incremental changes, and reviewable diffs.
- Testing: use red-green-refactor when the failure can be observed; record when a true red step was not captured.
- Security: server-side authorization, least privilege, RLS, no client secrets, tenant isolation, bounded input, rate limits, and negative tests.
- Delivery: run actual checks, inspect exact outputs, avoid claiming deployment or production readiness without evidence.

## External skill intake policy

Do not bulk-copy every repository found on GitHub. For each candidate, record:

1. Canonical repository, path, commit SHA, and retrieval date.
2. Whether it is an actual agent skill (SKILL.md) or a library, template, framework, or reference.
3. License and redistribution requirements.
4. Supported agent harnesses and compatibility with this repository.
5. Last meaningful update, maintenance signals, and known dependencies.
6. Duplicate/fork relationship and whether it adds anything beyond existing local skills.
7. Security review of scripts, shell commands, hooks, network calls, and file access.
8. A human-readable quality score and accepted/rejected/deferred decision.

Only vendor a candidate when its license permits it, its trigger is clear, it is relevant to an APEX task, it does not conflict with the repository's safety/approval rules, and it passes review.

## Current inventory status

- 8 project-local APEX skills are present on the integration branch.
- Foundational workflow guidance was also applied from the installed planning, design, TDD, code-review, verification, codebase-design, and Supabase skills during this work.
- The earlier large GitHub search was a candidate/reference list, not 100,000 validated skills. No claim is made that 100,000 skills have been downloaded, reviewed, or installed.
- The next intake should prioritize skills that materially help the current surfaces: vanilla web accessibility/performance, Flutter testing/architecture, Supabase authorization tests, and motion/render verification.

## Safety and approval

A skill is guidance, not permission. No skill can authorize production deployment, destructive database changes, payment activation, secret rotation, social account connection, PR merge, or release without the required explicit approval.