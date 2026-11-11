---
name: apex-flutter-ui
description: "Use when changing APEX STUDIO Flutter owner-app screens, widgets, navigation, responsive layouts, animations, design tokens, or Arabic/English presentation. Do NOT use for the public HTML/CSS/JavaScript website or Supabase schema/Edge Function changes."
---

# APEX Flutter Owner App UI

## Purpose
Deliver a distinctive, accessible APEX owner app while preserving the existing Flutter architecture and shared Supabase contracts.

## Workflow
1. Inspect `AGENTS.md`, the owner-app entry point in `flutter_admin/lib/`, nearby widgets, theme definitions, localization approach, and existing tests before editing.
2. Treat `flutter_admin/` as the owner app. The public website is the framework-free implementation in `apex/vanilla/`; do not create a duplicate Flutter website.
3. Reuse existing theme tokens, typography, spacing, components, and state management. Avoid one-off colors and duplicated widgets.
4. Preserve APEX identity: near-black/graphite foundation, electric blue primary accent, cyan secondary accent, cool-white text, and restrained low-opacity glow. Gold and red are not primary brand accents.
5. Preserve Arabic RTL and English LTR. Check text direction, alignment, icons, navigation order, and mixed-language labels in both modes.
6. Make layouts responsive for narrow Android phones, tablets, and desktop widths. Avoid fixed widths that overflow.
7. Respect reduced-motion preferences where supported. Keep animations short, purposeful, and non-blocking; do not animate layout dimensions on every frame.
8. Add or update widget tests for visible behavior and important interactions.

## Quality Gate
- [ ] No duplicate app architecture or unnecessary dependency.
- [ ] RTL and LTR both remain correct.
- [ ] Small-screen layout has no overflow.
- [ ] Keyboard/focus semantics and contrast remain usable.
- [ ] Existing navigation and data flows still work.
- [ ] Relevant Flutter tests and analysis were run; report exact results.

## Stop Conditions
Stop and present options before replacing navigation/state management, adding a major dependency, changing authentication/payment behavior, or changing the source of truth for owner data.
