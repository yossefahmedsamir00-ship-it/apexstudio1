# APEX Public Homepage Static Review — 2026-11-11

**Scope:** Static review of `apex/vanilla/index.html`, `app.js`, `styles.css`, `editorial.css`, and the existing homepage smoke tests on `feat/apex-integrated-build`.

**Review boundary:** This is a source-level review, not a browser-rendered visual audit. No page code, routes, production entrypoints, or runtime behavior were changed in this checkpoint.

## Confirmed strengths

- The homepage has one primary `h1`, descriptive alt text on both static images, and semantic landmarks including `header`, `nav`, `main`, `section`, and `footer`.
- The language switch updates both `document.documentElement.lang` and `dir`; Arabic selects RTL and English selects LTR.
- Keyboard focus styles exist for several interactive controls, and reduced-motion media queries are present in the stylesheet.
- The existing Vitest homepage smoke suite checks core controls, locale direction switching, assistant mode, service count, hero image alt text, and preservation of an unsent message when chat initialization fails.
- The primary CTA class named `.button-gold` currently renders with the electric-blue token; its name is stale, not evidence of a gold visual treatment.

## Findings to resolve during the focused homepage pass

1. **Legacy semantic naming:** `.button-gold` remains in homepage markup and CSS (for example `index.html` header/hero/form CTAs and `styles.css` around line 173). The visible fill is `var(--electric-blue)`, but the class name conflicts with the approved brand system and makes future styling harder to reason about. Rename only after checking all references across the vanilla site and tests.
2. **Legacy decoration naming:** `.welcome-gold-orbit` remains in the intro decoration styles (around `styles.css` line 2507), while its current border and glow are blue. Rename after confirming all matching markup and CSS references; do not change its geometry as part of a naming cleanup.
3. **Overflow masking:** the base stylesheet contains `overflow-x:hidden` near its opening rules. This can conceal an actual horizontal overflow defect instead of proving the layout is safe. The browser pass should inspect computed scroll width at 360/375/768/1024/1280px and identify the offending component before considering removal or replacement.
4. **Rendered verification missing:** source inspection and Vitest do not establish visual quality, contrast, mobile menu usability, dialog focus behavior, or the real rendered RTL layout. Capture and inspect mobile, intermediate, and desktop renders before calling the homepage visually verified.

## Verification evidence

- GitHub Actions website workflow on commit `c39b4fba24152b1fd3b187a3430c97475c5bbcba`: JavaScript syntax, unit tests, and Vite build passed.
- GitHub Pages workflow build passed; deployment was skipped because this was a pull request.
- Flutter analyze and tests passed on the same head; Android debug APK build was still running at the time of this review.
- No browser screenshot or interactive browser session was available in this review, so visual and rendered interaction claims remain open.

## Next bounded steps

- Complete rendered homepage review at mobile/intermediate/desktop widths and test both English LTR and Arabic RTL.
- Inspect menu, inquiry dialog, AI dialog, keyboard focus return, and reduced-motion behavior in a browser.
- Then resolve the stale class names and any measured overflow/contrast defects in a small, separately testable patch.
