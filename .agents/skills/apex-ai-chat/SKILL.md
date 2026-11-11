---
name: apex-ai-chat
description: "Use when implementing, debugging, or reviewing APEX's AI chat, model routing, prompt construction, streaming, conversation history, or the apex-client-chat Edge Function. Do NOT use for unrelated UI-only work or general AI theory."
---

# APEX AI Chat

## Purpose
Maintain a reliable AI chat experience with server-side model access, safe conversation handling, and honest user-facing status.

## Workflow
1. Trace the complete request path from Flutter chat UI through Supabase invocation to the Edge Function and model provider. Inspect existing contracts before changing them.
2. Preserve current conversation/message identifiers and response shapes unless a reviewed migration is approved.
3. Keep provider API keys and privileged credentials exclusively in server-side secrets. Never add keys to Dart constants, client environment files, logs, or sample code.
4. Treat prompts, attachments, retrieved text, and conversation history as untrusted content. Do not let user content override system/developer policy or tool permissions.
5. Validate authentication, ownership of the conversation, request size, supported content types, and rate limits on the server.
6. Handle provider timeout, rate limit, malformed response, empty output, and network failure with bounded retries and clear recoverable UI states.
7. Do not claim that an AI response was generated, stored, or delivered until the corresponding operation is confirmed.
8. Avoid logging full private conversations or secrets. Prefer request IDs and redacted diagnostics.
9. Add tests for success, unauthorized access, cross-user conversation access, invalid input, provider failure, and retry behavior.

## Acceptance Criteria
- Client contains no provider secret.
- A user cannot read or append to another user's conversation.
- Loading, empty, retry, and error states are clear in Arabic and English.
- Conversation persistence behavior is consistent with the existing schema.
- Tests cover both success and denial/failure paths.

## Stop Conditions
Stop before changing model/provider contracts, storing additional personal data, enabling external retrieval, or adding paid provider usage without an approved design and cost limit.
