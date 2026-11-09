# Vanilla Website Quality Pass — 2026-11-09

## Scope
This pass is limited to the isolated `apex/vanilla/` website on `feature/vanilla-website-migration`. The existing public entry point, admin, payment, Social AI, Flutter applications, backend functions, and deployment workflow were not edited by this quality pass.

## Findings fixed
1. **Inquiry email validation rejected valid addresses.** The email regular expression contained escaped backslashes, so a normal address such as `mina@example.com` failed validation. Corrected the expression to use whitespace and dot metacharacters as intended.
2. **Project filtering could throw for projects without tags.** Filtering now treats a missing or non-array `tags` field as an empty list.
3. **Stylesheet contained literal escaped newline sequences.** Converted the literal `\\n` sequences into real line breaks so the CSS is parsed as normal stylesheet source.

## Regression coverage
- Valid email acceptance.
- Malformed email rejection.
- Whitespace inside email rejection.
- Short project brief and missing contact consent rejection.
- Project filtering when optional tags are absent.

## CI evidence
GitHub Actions workflow `Validate APEX website migration`, run **#37**, completed successfully for commit `df9bd295050ef23e71543d12bee6f12f4dcbb2fe`.

Verified steps:
- Dependency installation — success.
- Vanilla JavaScript syntax check — success.
- Unit tests — success.
- Vite build for all configured entry points — success.

## Remaining work
- Browser-level checks at mobile, tablet, and desktop breakpoints.
- Verify Supabase environment configuration and RLS/Edge Function contracts against the production schema before enabling visitor writes.
- Verify visitor chat, owner chat, analytics, and inquiry flows end-to-end in a controlled environment.
- Compare visual and behavioral parity with the current public React implementation.
- Do not switch `apex/index.html`, merge to `main`, or deploy until the parity and release gates are satisfied.
