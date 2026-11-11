---
name: apex-task-planner
description: "Use when a requested APEX change spans multiple files, needs architecture or acceptance criteria, or is ambiguous enough to require a safe implementation plan. Do NOT use for a tiny, fully specified one-file edit or a simple factual question."
---

# APEX Task Planner

## Workflow
1. Read `AGENTS.md` and the closest existing plan/spec. Inspect the actual source tree and current implementation before proposing files.
2. Restate the user outcome in observable terms. Separate confirmed requirements from assumptions.
3. Identify the correct APEX surface: framework-free public website in `apex/vanilla/`, Flutter owner app in `flutter_admin/`, shared Supabase backend, AI chat, or shared infrastructure.
4. Preserve the established stack and source of truth: HTML/CSS/browser JavaScript for the public website, Flutter/Dart for the owner app, and the existing shared Supabase backend. Do not introduce React, a duplicate website, or a second backend.
5. Break work into small ordered tasks. Each task must identify files, behavior, interfaces, edge cases, and verification.
6. Identify dependencies and security/privacy implications. Prefer additive, reversible changes.
7. Present unresolved decisions only when they materially change architecture, data handling, cost, or user-visible behavior.
8. Follow the repository's approval gate for non-trivial design changes before implementation.

## Plan Quality Gate
- Every requirement maps to an implementation task and acceptance test.
- Existing behavior to preserve is explicit.
- No invented schema, API, credential, provider, or deployment assumption.
- Test and build commands are based on repository evidence.
- Production/destructive operations are separated from local implementation.
