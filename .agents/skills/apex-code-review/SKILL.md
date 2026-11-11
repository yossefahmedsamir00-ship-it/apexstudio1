---
name: apex-code-review
description: "Use when reviewing an APEX branch, pull request, commit, diff, or completed implementation for correctness, regressions, security, accessibility, performance, or adherence to the project specification. Do NOT use to implement a feature from scratch or answer general programming questions."
---

# APEX Code Review

## Review Method
1. Read `AGENTS.md` and the relevant product plan/spec before reviewing the diff.
2. Inspect the complete changed files and nearby callers/tests; do not review snippets in isolation.
3. Prioritize findings in this order: security/privacy, data loss/corruption, broken core flows, regressions, accessibility/RTL, performance, maintainability.
4. Verify each suspected issue against actual code paths. Do not report style preferences as defects.
5. For every finding, provide severity, file/line, concrete failure scenario, and a minimal corrective direction.
6. Check that tests meaningfully cover changed behavior and include negative/unauthorized cases where relevant.
7. Separate confirmed findings from risks that need runtime or environment verification.

## Required Output
- Summary: approve / changes requested / unable to conclude.
- Findings ordered by severity, each with evidence and impact.
- Missing tests and unverified runtime assumptions.
- Explicitly state when no findings were found; do not imply that this proves the system is secure.

## Stop Conditions
Do not modify code during a review-only request. Do not approve a change whose key security or data-integrity behavior has not been verified.
