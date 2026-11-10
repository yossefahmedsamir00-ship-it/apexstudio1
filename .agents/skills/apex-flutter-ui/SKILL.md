---
name: apex-flutter-ui
description: "Use when changing APEX STUDIO public Flutter website or Flutter owner app screens, widgets, navigation, responsive layouts, animations, design tokens, or Arabic/English presentation. Do NOT use for Supabase schema or Edge Function changes, or generic Dart questions unrelated to APEX."
---

# APEX Flutter UI

## Purpose
Deliver distinctive, accessible APEX interfaces while preserving the repository's Flutter architecture and visual identity.

## Workflow
1. Inspect `AGENTS.md`, the relevant app entry point, nearby widgets, theme definitions, localization approach, and existing tests before editing.
2. Confirm which surface is in scope:
   - Public website: inspect `apex/lib/` and its existing Flutter Web structure.
   - Owner app: inspect `flutter_admin/lib/` and its current navigation/state patterns.
   - Do not create a second implementation in HTML/React or merge the two apps without an approved design.
3. Reuse existing theme tokens, typography, spacing, components, and state management. Avoid one-off colors and duplicated widgets.
4. Preserve APEX identity: premium dark/graphite foundation, restrained gold accents, controlled blue glow, clear contrast, and purposeful motion. Do not turn every element into a glow or gradient.
5. Preserve Arabic RTL and English LTR. Check text direction, alignment, icons, navigation order, and mixed-language labels in both modes.
6. Make layouts responsive for narrow phones, tablets, and desktop widths. Avoid fixed widths that overflow.
7. Respect reduced-motion preferences where the current architecture supports them. Keep animations short, purposeful, and non-blocking.
8. Add or update widget tests for visible behavior and important interactions.

## Quality Gate
- [ ] No duplicate app architecture or unnecessary dependency.
- [ ] RTL and LTR both remain correct.
- [ ] Small-screen layout has no overflow.
- [ ] Keyboard/focus semantics and contrast remain usable.
- [ ] Existing navigation and data flows still work.
- [ ] Relevant Flutter tests and web build were run; report exact results.

## Stop Conditions
Stop and present options before changing the app's source of truth, replacing navigation/state management, adding a major dependency, or changing authentication/payment behavior.
