# APEX SOCIAL AI — Unified Brand & Growth System

Status: product/engineering blueprint for this branch. This document does not claim that UI, integrations, or automations are deployed.

## Product promise
One operating system for APEX STUDIO's brand, content, community, campaigns, and growth decisions. It combines a persistent Brand Brain, AI-assisted production, human approval, official integrations, and measurable learning loops.

Release 1 is owner-operated for APEX STUDIO. The tenant model remains ready for client workspaces, but client access is not enabled until authorization and billing boundaries are designed and reviewed.

## 1. Experience modules

### A. Growth Command Center
- Today's publishing queue, overdue drafts, approvals waiting, connector health, and automation failures.
- Campaign performance summaries only when backed by imported or provider-sourced data.
- Separate actual metrics, AI hypotheses, and recommendations.
- Alerts for failed jobs, expired permissions, and stale analytics.

### B. Brand Brain
Tenant-scoped knowledge layer:
- Brand profile: positioning, audience segments, tone, vocabulary, prohibited claims, differentiators, visual rules, and approved CTAs.
- Products/services: descriptions, features, owner-supplied pricing, availability, proof points, FAQs, and approved claims.
- Audience evidence: customer reviews, support themes, objections, testimonials, and anonymized research notes.
- Brand assets: logos, color/type references, approved photos/video, usage rights, and asset metadata.
- Campaign memory: briefs, creative variants, results, learnings, and decisions.

Ingestion flow:
1. Owner uploads or enters a source.
2. Store original file/record and metadata with tenant, source, date, and permissions.
3. Extract text and classify it into brand/product/audience/campaign knowledge.
4. Generate searchable chunks and embeddings only if vector capability is configured.
5. Mark extracted facts with source references and confidence; flag conflicts for owner review.
6. Owner approves canonical brand facts before they become authoritative.

Rules:
- Never invent prices, product properties, testimonials, certifications, or performance results.
- Distinguish source facts from AI-generated hypotheses.
- Support versioning, source traceability, retention policy, and tenant isolation.
- Minimize customer data and exclude sensitive personal information from general marketing memory.

### C. Trend & Research Desk
- Collect public trend signals through approved search/data providers and platform trend surfaces where available.
- Every trend item records platform, observed date, source URL/reference, geography/language, evidence, and expiry.
- Score relevance using audience fit, brand fit, timeliness, production effort, and risk.
- Do not promise real-time trend coverage unless a live source is connected.
- Research agent produces evidence-backed opportunity briefs, not copied posts.

### D. AI Content Studio
For each campaign brief, generate:
- Core message, objective, audience, funnel stage, and CTA.
- Platform-specific variants for Instagram, X, TikTok, and YouTube.
- Captions, post copy, short-form scripts, titles, descriptions, and hashtag suggestions.
- Creative direction, format, aspect ratio, visual references, and asset checklist.
- Content calendar recommendations and reuse/repurposing map.

Platform outputs are adapted rather than blindly cross-posted. X content planning and copy generation can be available before an X publishing API connector is approved.

### E. UGC Studio
- Creative angles: problem/solution, unboxing, demo, genuine testimonial, FAQ, behind-the-scenes, comparison, and founder story.
- Each script includes hook, scene-by-scene shot list, spoken lines, on-screen text, B-roll, CTA, estimated duration, and editing notes.
- Label fictional/sample scripts as concepts. Never fabricate a customer testimonial or imply a real person used a product without evidence and permission.
- Include disclosure reminders for paid endorsements and usage rights for creator footage/music.

### F. Publishing & Approval Center
- Calendar, drafts, version history, review queue, scheduled jobs, and delivery status.
- Approval binds to the exact content version and exact target accounts/platforms.
- Any edit invalidates approval.
- Capability validation checks account type, media format, permissions, API limits, and policy restrictions.
- Publishing starts manually after owner approval; automated scheduling is enabled only after connector and reliability tests.
- n8n receives opaque job IDs only. It cannot bypass approval or call providers using stored secrets.

### G. Meta Ads Intelligence
Initial mode:
- Import owner-provided Meta Ads reports/exports or connect a read-only approved integration.
- Analyze spend, impressions, reach, frequency, CPM, CTR, CPC, landing-page conversion, CPA, and ROAS only when required fields exist.
- Identify tracking gaps, attribution windows, sample-size limitations, and date-range mismatches.
- Produce test hypotheses, audience/creative recommendations, and budget scenarios with assumptions clearly stated.

Later mode:
- Official Meta Marketing API integration after app setup, permissions, review, and secure OAuth.
- Separate read and write permissions. Campaign creation, budget changes, and pausing remain disabled by default and require explicit owner confirmation.
- No claims of improved ROAS or guaranteed results. Scaling decisions require enough conversion volume and stable measurement.

### H. Growth Analytics & Learning Loop
- Daily/weekly/monthly reporting with platform, account, campaign, creative, and date-window dimensions.
- Maintain metric definitions and source timestamps.
- Compare creative cohorts and campaign objectives fairly; flag missing data.
- Feed validated learnings into Brand Brain as proposed insights awaiting owner acceptance.
- AI recommendations show evidence, assumptions, confidence, and the next measurable test.

### I. Automation Center
Proposed n8n workflows:
1. Brief submitted → Research → content plan draft → owner notification.
2. Content approved → schedule request → platform capability check → queue job.
3. Due publish job → worker claims lease → provider publish → reconcile status → notify owner.
4. Daily analytics sync → anomaly checks → report draft.
5. New brand document → ingest/extract/classify → review queue.
6. Failed connector/workflow → retry if transient → alert owner if action is required.

All webhooks are authenticated, signed where supported, replay-protected, rate-limited, and idempotent. n8n is orchestration, never the source of truth for approvals or permissions.

## 2. Agent roles and permissions
- Orchestrator: plans tasks, selects agents, tracks dependencies, and composes outputs.
- Research Agent: gathers trend/competitor/context evidence and cites sources.
- Brand Strategist: consults approved Brand Brain facts and flags contradictions.
- Writer Agent: produces platform-specific copy and scripts.
- Creative Agent: prepares visual directions, shot lists, and asset briefs.
- Performance Analyst: analyzes supplied/provider data and labels uncertainty.
- Ads Planner: proposes tests and scenarios; cannot spend or change budgets.
- QA/Policy Agent: checks claims, brand voice, disclosure, format, and platform policy.
- Human owner: final authority for approvals, publishing, account connection, and any ad spend or budget changes.

No agent may approve its own work, publish, alter budgets, or bypass policy gates.

## 3. Shared campaign workflow
1. Intake: idea/product/goal, audience, offer, geography, dates, budget (if ads), and constraints.
2. Brand context: retrieve only approved and relevant Brand Brain sources.
3. Research: gather dated evidence and current platform constraints.
4. Strategy: define objective, message, funnel stage, creative hypotheses, and KPIs.
5. Production: generate platform variants, UGC scripts, creative briefs, and calendar.
6. QA: factual claims, tone, rights/disclosures, links, dimensions, and platform constraints.
7. Human review: approve/edit/reject exact versions and destinations.
8. Execution: schedule/publish or export assets; ads remain recommendations unless separately authorized.
9. Measurement: ingest real metrics, compare against baseline, and record learnings.
10. Memory update: propose evidence-backed Brand Brain insights for owner acceptance.

## 4. Proposed domain model additions
Additive entities to evaluate after reconciling the existing Supabase schema:
- brand_profiles, brand_profile_versions
- brand_knowledge_sources, brand_knowledge_chunks
- brand_products, brand_audience_segments, brand_claims
- brand_assets, brand_asset_rights
- social_trend_observations
- social_campaign_briefs, social_creative_variants
- social_experiment_hypotheses, social_experiment_results
- ads_accounts, ads_campaign_snapshots, ads_adset_snapshots, ads_ad_snapshots
- ads_recommendations, ads_change_approvals
- social_agent_runs, social_agent_artifacts

Every tenant-owned entity carries tenant scope. Original source references and extraction provenance must be retained. Do not apply these tables until schema drift and current migrations are reconciled.

## 5. Proposed Edge Function boundaries
- brand-knowledge: upload metadata, ingestion status, search approved knowledge, review extracted facts.
- social-research: create research jobs and store source-backed trend observations.
- social-campaigns: campaign briefs, generated variants, content packaging.
- social-api: authenticated read/write content and calendar operations under existing contracts.
- social-oauth-start/callback: official platform connection flows only.
- social-publish-worker: internal idempotent publisher with approval/version re-check.
- social-analytics-sync: provider/import ingestion with metric provenance.
- ads-insights: report import and read-only analysis.
- ads-oauth: later official Marketing API connection.
- ads-change-requests: create owner-reviewed proposals; no direct budget mutation in the initial release.

All functions reuse the existing AI Gateway for model calls. Avoid exposing provider tokens, service-role credentials, raw customer data, or internal error details to clients.

## 6. Platform rollout
- Instagram and Facebook Pages: official Meta APIs after account eligibility, app permissions, OAuth, and review.
- TikTok: official Content Posting API; respect scopes, creator checks, and app audit limitations.
- YouTube: official YouTube Data API with OAuth, quota, upload, and processing-state handling.
- X: content generation/research first; publishing connector only after API access, terms, and cost/plan suitability are confirmed.
- Meta Ads: report import/read-only insights first; write-capable Marketing API remains gated and out of initial release.

## 7. Delivery phases
### Phase 1 — Product foundation
- This unified product blueprint and API contracts.
- Reconcile current database schema/migration drift.
- Validate social foundation migrations in a disposable test database.
- Define typed contracts, owner authorization, tenant isolation, and audit events.

### Phase 2 — Brand Brain MVP
- Brand profile and versioning.
- Source/document upload metadata and reviewed extraction.
- Product/service facts and approved claims.
- Search over approved knowledge with provenance.

### Phase 3 — Content & UGC MVP
- Campaign brief intake.
- Research-backed content plans and multi-platform variants.
- UGC script and creative brief generation.
- QA and human approval workflow.

### Phase 4 — Publishing & automation
- Calendar and n8n job orchestration.
- One official connector at a time.
- Idempotency, retries, reconciliation, and operational alerts.

### Phase 5 — Analytics & Ads Intelligence
- Import reports and metric dictionary.
- Performance analysis and experiment tracking.
- Official read-only integrations when approved.
- Write-capable ad actions only after separate explicit authorization and controls.

### Phase 6 — Client workspaces
- Tenant onboarding, roles, permissions, usage metering, and client-specific Brand Brain.
- No cross-tenant retrieval or analytics.

## 8. Acceptance criteria
- Every recommendation distinguishes evidence, assumption, and hypothesis.
- Every factual brand/product claim traces to an approved source.
- No fabricated testimonials, reviews, metrics, or trend claims.
- Content is adapted to each platform.
- Owner approval is required before publishing.
- AI agents cannot approve, publish, connect accounts, or spend ad budget.
- All secrets stay server-side and all tenant data is isolated.
- Ads analysis reports metric definitions, date range, attribution context, and data gaps.
- Automation is idempotent, observable, and recoverable.
- UI and API tests, security tests, and production builds pass before release.

## 9. Out of scope until separately approved
- Applying migrations to production.
- Connecting real social or ad accounts.
- Publishing real posts or changing ad campaigns/budgets.
- Enabling client tenant access.
- Scraping private data or bypassing platform API restrictions.
