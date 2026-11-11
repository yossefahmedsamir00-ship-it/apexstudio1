---
name: apex-motion-system
description: "Use when designing or changing APEX website/app animations, transitions, scroll effects, parallax, micro-interactions, loading motion, or motion performance. Do NOT use for static layout-only changes."
---

# APEX Motion System

## Intent
Motion must clarify hierarchy, show state change, connect navigation, or express APEX's visual identity. It must not delay access to content or hide controls.

## Rules
1. Use the smallest motion that communicates the change; prefer opacity and transform over layout-affecting animation.
2. Use consistent timing tiers: micro-feedback 120–180ms, component transitions 180–280ms, section reveals 350–550ms. These are defaults, not requirements when the existing behavior has a measured reason.
3. Keep easing consistent: ease-out for entry, ease-in for exit, and a restrained ease-in-out for continuous ambient movement.
4. Never make core content depend on scroll-triggered JavaScript. Content remains visible if IntersectionObserver or animation initialization fails.
5. Respect `prefers-reduced-motion: reduce`: remove non-essential movement, parallax, looping, auto-scrolling, and smooth scrolling; preserve state changes and clear focus feedback.
6. Do not flash, strobe, rapidly pulse, or continuously move high-contrast elements near primary reading content.
7. Keep pointer effects optional and non-essential; provide touch and keyboard equivalents.
8. Avoid expensive blur/backdrop-filter layers and large 3D scenes on low-end devices. Use a reduced visual treatment at small widths or under reduced-motion settings.
9. Keep animation ownership local to the component/page that owns the state. Avoid global scroll listeners when CSS or IntersectionObserver is sufficient.
10. Test at 375px and desktop widths, with reduced motion enabled, and confirm no overflow or blocked interaction.

## Review checklist
- [ ] Motion has a named purpose: hierarchy, continuity, feedback, or brand.
- [ ] The no-motion experience remains complete.
- [ ] Keyboard and touch users can reach every state.
- [ ] No animation changes document flow unexpectedly.
- [ ] Low-end mobile has a lightweight fallback.
- [ ] Actual render/behavior evidence is separated from subjective design judgment.
