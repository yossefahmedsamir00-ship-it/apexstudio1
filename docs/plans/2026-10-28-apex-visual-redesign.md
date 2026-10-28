# APEX STUDIO Visual Redesign Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the existing APEX STUDIO frontend into one cohesive premium, bold, AI-futurist experience while preserving current content and working interactions.

**Architecture:** Keep the existing Vite + React + TypeScript structure. Evolve the global CSS and make small, targeted semantic/accessibility improvements in the current React entry point; do not introduce a new UI framework or runtime dependency.

**Tech Stack:** Vite, React 18, TypeScript, lucide-react, CSS, Vitest.

## Global Constraints

- Combine Digital Luxury, Bold Digital, and AI Future into one consistent art direction: near-black surfaces, metallic gold, restrained fire-red and electric-blue accents, oversized editorial type, cinematic depth, and selective glass-like UI.
- Preserve Arabic/English switching, RTL/LTR direction, project filtering and detail modal, project request modal validation, and AI chat request flow.
- Design mobile intentionally; keep readable contrast, visible keyboard focus, touch-friendly controls, semantic landmarks, and reduced-motion support.
- Do not claim AI chat, request submission, payments, or owner notifications are live unless the backend is configured and verified.
- Do not add live payment processing or put secrets in browser code.
- Keep the build and existing tests passing. Do not merge to main without review.

---

### Task 1: Rebuild the visual system and responsive layout

**Files:**
- Modify: `apex/src/styles.css`
- Test: `apex/package.json` scripts `test` and `build`

**Interfaces:**
- Consumes: current CSS class names in `apex/src/main.tsx`, including `.hero`, `.heroVisual`, `.projectGrid`, `.serviceRow`, `.processGrid`, `.aboutSection`, `.ctaSection`, modals and form controls.
- Produces: consistent design tokens, layout rules, component states, mobile breakpoints and reduced-motion behavior without changing existing React component APIs.

- [ ] **Step 1: Capture baseline behavior**
Run: `cd apex && npm test`
Expected: existing Vitest suite passes before style changes.

- [ ] **Step 2: Implement the CSS redesign**
Replace the existing stylesheet while retaining every class selector currently referenced by `main.tsx`. Add layered cinematic gradients, a stronger editorial hero, responsive project art, distinctive service rows, clear section rhythm, glass-like assistant/modal surfaces, visible hover/focus states, and mobile-first refinements. Use gold as the primary accent, with red/blue limited to selected visual details.

- [ ] **Step 3: Verify existing behavior**
Run: `cd apex && npm test`
Expected: project filtering and project request validation tests remain green.

- [ ] **Step 4: Verify production compilation**
Run: `cd apex && npm run build`
Expected: TypeScript compilation and Vite production build complete without errors.

- [ ] **Step 5: Commit the independently reviewable change**
```bash
git add apex/src/styles.css
git commit -m "style: redesign APEX STUDIO visual system"
```

### Task 2: Improve interaction accessibility and honest assistant states

**Files:**
- Modify: `apex/src/main.tsx`
- Modify only if required by the focused change: `apex/src/styles.css`

**Interfaces:**
- Consumes: existing React component state and `aiClient.generate`.
- Produces: explicit keyboard-accessible project cards and clear assistant loading/error/disclosure states without changing the AI API contract.

- [ ] **Step 1: Add focused tests for any extracted pure behavior**
If a pure helper is extracted, add Vitest cases for its valid and invalid inputs before implementation; otherwise keep this task limited to accessible markup and state copy and use the existing suite as regression coverage.

- [ ] **Step 2: Make targeted markup improvements**
Use semantic buttons for interactive project cards, preserve visible focus styles, and label the assistant as an AI assistant in English and Arabic. Ensure the existing loading, error, and retry behavior remains clear and no success is shown when the AI request fails.

- [ ] **Step 3: Verify regression coverage**
Run: `cd apex && npm test`
Expected: all existing tests pass and any added pure-helper tests pass.

- [ ] **Step 4: Verify the production build**
Run: `cd apex && npm run build`
Expected: TypeScript and Vite build pass.

- [ ] **Step 5: Commit the independently reviewable change**
```bash
git add apex/src/main.tsx apex/src/styles.css
git commit -m "feat: improve APEX interaction accessibility"
```

### Task 3: Review deploy configuration and publish candidate

**Files:**
- Inspect: `.github/workflows/deploy.yml`
- Inspect: `apex/index.html`
- Modify only if the built artifact exposes a concrete issue: the relevant file above.

**Interfaces:**
- Consumes: successful frontend build and the repository's GitHub Pages workflow.
- Produces: a reviewed pull request with verifiable test/build status and a deployment link only if GitHub confirms the deployment.

- [ ] **Step 1: Check metadata and base-path assumptions**
Verify title, description, theme color, asset paths and Vite base path are compatible with `https://yossefahmedsamir00-ship-it.github.io/apexstudio1/`.

- [ ] **Step 2: Run final checks**
Run: `cd apex && npm test && npm run build`
Expected: tests and production build pass.

- [ ] **Step 3: Open a pull request**
Create a pull request from `feat/apex-visual-redesign` to `main`, summarize visual changes, list verification results, and clearly state any backend or external setup not completed.

- [ ] **Step 4: Verify deployment after merge**
Only report a live deployment after a successful GitHub Actions run and a confirmed Pages URL. If workflow access or deployment confirmation is unavailable, report that limitation precisely.

## Unresolved external prerequisites

- The AI assistant requires a configured server-side gateway and secret provider; the current frontend must continue to show a truthful configuration/error state until verified.
- Live client chat, owner notifications, and the ten-minute AI handoff require a deployed backend, persistent storage, authorization rules, and server-side scheduling; this visual pass does not claim to implement them.
- Live payments require an approved merchant account, sandbox verification, server-side signed webhook handling, and production credentials; no real payment collection is enabled by this plan.
