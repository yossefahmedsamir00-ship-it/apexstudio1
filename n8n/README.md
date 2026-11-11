# APEX SOCIAL AI — n8n Foundation

This directory contains the first importable n8n workflow and the implementation contract for connecting n8n to APEX SOCIAL AI.

## Current status
- `01-content-request-intake.json`: credential-free webhook intake and request validation.
- This starter does NOT generate AI content, write to Supabase, schedule posts, or publish to social platforms.
- The response explicitly uses `mode: foundation_only` so the UI cannot mistake validation for completed AI work.
- Workflow is inactive on import. Review it, configure authentication, test it, then activate it.
- No API keys, Supabase service-role keys, OAuth tokens, or passwords are included.

## Import
1. Create your n8n Cloud workspace.
2. Open Workflows → Import from File.
3. Import `01-content-request-intake.json`.
4. Configure authentication on the Webhook node before production use. Do not expose an unauthenticated production webhook.
5. Use the Test URL while testing. Activate only after a successful test.
6. Do not put a privileged webhook secret in browser JavaScript. APEX must call n8n through an authenticated server-side integration.

## Request contract
POST JSON:
```json
{
  "request_id": "client-generated-unique-id",
  "brief": "Create a launch campaign for APEX STUDIO...",
  "platforms": [
    "instagram",
    "facebook",
    "tiktok"
  ],
  "language": "ar",
  "tone": "premium",
  "audience": "small businesses"
}
```
Required: `brief` (10–5000 characters) and `platforms` (one or more of instagram, facebook, tiktok, youtube, x, linkedin).

A successful response uses `stage: intake_validated` and `mode: foundation_only`. This is a validation acknowledgment, not a content-generation result.

## Target production architecture
| Workflow | Responsibility | Gate |
|---|---|---|
| WF-01 Orchestrator | Authenticate, validate, assign request ID, dispatch sub-workflows | Auth + schema validation |
| WF-02 Brand Brain | Load approved brand profile and reference documents | Tenant-scoped read |
| WF-03 Content Factory | Generate platform-specific drafts through server-side AI credentials | Token / cost limits |
| WF-04 Platform Adapter | Enforce per-platform format and length constraints | Schema validation |
| WF-05 Quality Control | Check brand voice, unsupported claims, safety, and completeness | Reject or request revision |
| WF-06 Approval Center | Persist draft and request explicit owner approval | Mandatory human approval |
| WF-07 Scheduler | Schedule only approved content | Approval + idempotency |
| WF-08 Publisher | Publish through official platform APIs only | OAuth scopes + platform permissions |
| WF-09 Analytics | Import permitted metrics and summarize performance | Read-only by default |
| WF-10 Error Handler | Normalize errors, retry transient failures, alert owner | Bounded retries + audit log |

## Production integration rules
- Keep AI credentials in n8n Credentials, never in workflow literals or frontend bundles.
- Prefer a narrowly scoped server-side integration endpoint between the browser and n8n.
- Validate the Supabase user and tenant server-side before accepting work.
- Use a unique `request_id` / idempotency key to prevent duplicate generation and publishing.
- Persist workflow run IDs, state transitions, attempts, and sanitized errors.
- Retry only transient errors with bounded attempts and backoff.
- Require explicit human approval before scheduling or publishing.
- Use official APIs and approved OAuth permissions. Do not scrape platforms or bypass restrictions.
- Start with draft generation and read-only analytics. Publishing remains disabled until each platform app and permission is verified.

## Next gate
Once the n8n workspace exists, connect this workflow to the APEX server-side API and Supabase using the actual project schema and auth model. Then implement Brand Brain and Content Factory against approved brand documents and the selected AI provider. Do not mark production-ready until authorization, idempotency, failure handling, and approval tests pass.