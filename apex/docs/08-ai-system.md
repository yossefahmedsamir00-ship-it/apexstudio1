# 08 — APEX STUDIO AI System

## Goal

Add a provider-neutral AI layer without exposing model API keys in the browser.

## Agents

1. **Orchestrator** — classifies intent and delegates.
2. **Discovery** — converts vague ideas into a project brief.
3. **Sales** — qualifies leads and explains services.
4. **UX** — user journeys, IA, accessibility and interaction.
5. **Copy** — Arabic/English marketing and product copy.
6. **Technical** — architecture, APIs, data, security and deployment.
7. **Support** — product/site help.
8. **Research** — research planning and evidence-aware summaries.

## Model strategy

The UI refers to logical model IDs rather than hard-coded provider model names.
This keeps the site maintainable when providers rename or retire models.

Suggested routing:

- reasoning tier → architecture, orchestration and complex planning
- balanced tier → discovery, sales, UX and copy
- fast tier → support and lightweight interactions

Actual provider model names are configured through environment variables on the
server-connected deployment.

## Security boundary

The GitHub Pages frontend must never contain provider API keys. The frontend calls
`VITE_AI_API_URL`, which should point to a trusted server-side gateway such as a
Firebase/Cloud Run/other backend endpoint.

The gateway is responsible for:

- authentication/abuse controls
- provider API keys
- rate limiting
- request logging with data minimization
- model allow-listing
- validation of agent and model IDs
- output limits
- error normalization

## Current integration state

The modules in `src/ai/` are provider-neutral and safe to ship as frontend code.
The live provider gateway is intentionally separate because GitHub Pages is static
hosting and cannot safely store provider secrets.
