---
name: apex-vanilla-web
description: "Use when implementing, debugging, organizing, or reviewing the APEX public website in apex/vanilla using semantic HTML, CSS, and browser JavaScript modules. Do NOT use for Flutter owner-app screens or Supabase schema changes."
---

# APEX Vanilla Public Website

## Source of truth
- The public web target is `apex/vanilla/` and must remain framework-free: semantic HTML, CSS, and browser ES modules.
- Preserve the current React entrypoint until the vanilla site passes behavior parity and deployment review.
- Keep the public site connected to the existing Supabase contracts; do not invent a second backend or alter RPC payloads casually.

## Workflow
1. Read `AGENTS.md`, `apex/vanilla/README.md`, the relevant page/module, and its tests before editing.
2. Trace each interaction from HTML control through browser module to the existing Supabase RPC or Edge Function.
3. Keep modules cohesive: page-specific behavior belongs with its page; shared translation, data, preview validation, and site-core behavior stay in their existing shared modules.
4. Preserve Arabic RTL and English LTR, keyboard access, visible focus, and narrow-phone behavior.
5. Use the approved APEX palette: near-black/graphite, electric blue, cyan, cool white, and muted slate. Avoid gold-led templates and indiscriminate neon.
6. Treat CMS and visitor data as untrusted. Escape text, validate links, and never execute user-supplied project code on the APEX origin.
7. Preserve truthful states: do not show an inquiry, message, publish, or payment as successful until the server confirms it.
8. Add focused Vitest coverage for changed browser behavior and preserve existing smoke tests.

## Motion and performance
- Prefer CSS transitions and transforms for short feedback and entrance motion.
- Respect `prefers-reduced-motion`; disable non-essential parallax, reveal, looping, and smooth scrolling when requested.
- Avoid heavy libraries and large assets unless a measured need justifies them.
- Avoid forced layout reads/writes in scroll handlers; use passive listeners and requestAnimationFrame where already required.
- Keep core content and controls usable when animation, remote fonts, or decorative imagery fail.

## Verification
Run from `apex/`:
- `npm test`
- `npm run build`
- `node --check` for changed standalone browser modules where useful.

Report exact commands and results. Do not claim rendered verification unless a browser capture was actually inspected.
