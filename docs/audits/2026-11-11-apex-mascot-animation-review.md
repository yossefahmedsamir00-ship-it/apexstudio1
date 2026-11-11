# APEX STUDIO Mascot Animation Review

**Date:** 2026-11-11  
**Branch:** `feat/apex-integrated-build`  
**Scope:** Static source review and animation technology research only. No production files, assets, runtime behavior, or deployments were changed in this review.

## User-approved direction

Use the armored astronaut shown in the upper-left hero area of the supplied APEX reference image as the public-site mascot. Keep the mascot's recognizable armor silhouette and blue-lit visor, and align the accent lighting with the established black, electric-blue, and cyan APEX palette. Do not use the small AI-assistant robot from the lower-right area of the reference image.

The intended experience is:
- First visit: astronaut enters with a short, non-blocking welcome animation and a localized greeting: Arabic `أهلاً بيك في APEX STUDIO`; English `Welcome to APEX STUDIO`.
- Persistent guide: a compact astronaut remains near the edge of the viewport and responds subtly to scroll direction/progress.
- Section awareness: the mascot may change pose or show a short contextual bubble when the visitor reaches major sections.
- Mobile: smaller, less intrusive presentation; no obstruction of navigation, chat, or form controls.
- Accessibility: honor `prefers-reduced-motion`; never require audio; speech must be user-initiated or clearly optional.

## Existing implementation findings

Reviewed on `feat/apex-integrated-build`:
- `apex/vanilla/index.html` loads `app.js`, `styles.css`, and `editorial.css`; its current hero is an editorial image-led layout, not the supplied astronaut composition.
- `apex/vanilla/scroll-mascot.js` contains a lightweight scroll-progress/section observer controller. It expects an element with id `apex-scroll-mascot`, updates CSS custom properties with requestAnimationFrame, and observes page sections using IntersectionObserver.
- `apex/vanilla/styles.css` contains CSS character-study selectors for a persistent mascot and a cinematic welcome scene.
- `apex/vanilla/welcome-intro.js` expects an element with id `apex-welcome`, stages localized welcome copy, and uses optional browser speech synthesis.
- In the reviewed homepage entry and `app.js`, neither mascot controller nor welcome controller is imported, and the required `apex-scroll-mascot` / `apex-welcome` roots were not found. Therefore these files should be treated as dormant prototypes until their integration is verified; the README's statement that they are mounted is not established by the reviewed entry point.
- The current CSS character study is not the supplied armored astronaut and is not a final rigged character asset.

## Technology research and recommendation

1. **Keep the current framework-free HTML/CSS/ES-module architecture.** Do not introduce React or a large animation framework for this feature.
2. **First implementation:** use an optimized transparent image asset for the approved astronaut, CSS transforms/keyframes for entrance and idle motion, IntersectionObserver for section changes, and the existing requestAnimationFrame scroll controller for subtle scroll-linked movement. Restrict animated properties primarily to transform and opacity.
3. **Advanced version:** use Rive only if a properly prepared and licensed character file is available and multiple authored poses/state-machine interactions justify the additional runtime. Rive state machines support boolean/number inputs and triggers that can be driven by JavaScript.
4. **GSAP ScrollTrigger is capable of scrubbed and section-triggered motion**, but should not be added by default. It is a larger dependency than needed for a small floating guide; reconsider only if the page requires complex pinned timelines or several coordinated scroll sequences.
5. Keep the welcome voice optional and user-controlled. Browser speech synthesis availability and voices vary, so the visual greeting must stand alone.

## Sources reviewed

- GSAP ScrollTrigger documentation: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Rive state-machine documentation: https://github.com/rive-app/help-center/blob/master/runtimes/state-machines.md
- Rive Web runtime: https://github.com/rive-app/rive-wasm

## Next implementation steps

- Create or obtain a clean, transparent astronaut asset that matches the upper-left character in the user's reference; do not use the entire composite screenshot as the character asset.
- Add semantic welcome and persistent-mascot markup to the vanilla homepage, with localized accessible labels and a dismiss/skip control for the welcome layer.
- Wire the existing controllers from the actual page entry and add focused tests proving they mount only when their required elements exist.
- Replace the CSS placeholder anatomy with the approved image/asset while preserving the established blue/cyan palette.
- Verify Arabic RTL and English LTR, keyboard operation, reduced motion, small-screen overlap, image loading fallback, and no horizontal overflow.
- Run the website syntax checks, unit tests, build, and browser/device visual QA before marking the feature complete.

## Verification limits

This is a static code review and technology assessment, not a browser/device test. No claim is made that the welcome scene or persistent mascot currently runs on the live site. No production deployment or PR merge was performed.
