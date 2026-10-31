import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  assertAllowedOrigin, correlationId, FlowRequestError, jsonResponse,
  readJsonBody, requireEnum, requireString, toFlowError,
} from "../_shared/flow-engine-contracts.ts";
import { getFlowContext } from "../_shared/flow-engine-auth.ts";
import { writeFlowAudit } from "../_shared/flow-engine-audit.ts";

type Context = Awaited<ReturnType<typeof getFlowContext>>;
type Row = Record<string, unknown>;

async function contentHash(title: string, body: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ title, body }));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function mapDraft(row: Row) {
  return {
    id: row.id, ownerUserId: row.owner_user_id, operationId: row.operation_id,
    platform: row.platform, title: row.title, body: row.body,
    contentHash: row.content_hash, revision: row.revision, status: row.status,
    scheduledAt: row.scheduled_at, publishedAt: row.published_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function listDrafts(context: Context) {
  const { data, error } = await context.admin.from("flow_publishing_drafts").select("*")
    .eq("owner_user_id", context.user.id)
    .order("updated_at", { ascending: false }).limit(100);
  if (error) throw new FlowRequestError("internal_error", 500);
  return { drafts: (data ?? []).map(mapDraft) };
}

async function createDraft(context: Context, body: Record<string, unknown>) {
  const operationId = requireString(body.operationId, "operationId", 80);
  const platform = requireEnum(body.platform, "platform",
    ["instagram", "facebook", "x", "tiktok", "youtube", "other"] as const);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  const text = requireString(body.body, "body", 12000);

  const { data: operation, error: operationError } = await context.admin
    .from("flow_operations").select("id").eq("id", operationId)
    .eq("owner_user_id", context.user.id).maybeSingle();
  if (operationError) throw new FlowRequestError("internal_error", 500);
  if (!operation) throw new FlowRequestError("not_found", 404);

  const hash = await contentHash(title, text);
  const { data, error } = await context.admin.from("flow_publishing_drafts").insert({
    owner_user_id: context.user.id, operation_id: operationId, platform,
    title, body: text, content_hash: hash, revision: 1, status: "draft",
  }).select("*").single();
  if (error) throw new FlowRequestError("internal_error", 500);

  await writeFlowAudit(context, "publishing.draft_created", "flow_publishing_draft", String(data.id), {
    operation_id: operationId, platform, revision: 1, status: "draft",
  });
  return mapDraft(data);
}

async function updateDraft(context: Context, body: Record<string, unknown>) {
  const draftId = requireString(body.draftId, "draftId", 80);
  const { data: current, error: readError } = await context.admin.from("flow_publishing_drafts")
    .select("*").eq("id", draftId).eq("owner_user_id", context.user.id).maybeSingle();
  if (readError) throw new FlowRequestError("internal_error", 500);
  if (!current) throw new FlowRequestError("not_found", 404);

  const title = body.title === undefined ? String(current.title) :
    typeof body.title === "string" && body.title.length <= 300
      ? body.title.trim() : (() => { throw new FlowRequestError("validation_error", 400); })();
  const text = body.body === undefined ? String(current.body) :
    requireString(body.body, "body", 12000);
  if (title === current.title && text === current.body) return mapDraft(current);

  const hash = await contentHash(title, text);
  const { data, error } = await context.admin.from("flow_publishing_drafts").update({
    title, body: text, content_hash: hash, revision: Number(current.revision) + 1,
    status: "draft", scheduled_at: null, updated_at: new Date().toISOString(),
  }).eq("id", draftId).eq("owner_user_id", context.user.id)
    .eq("revision", current.revision).select("*").maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!data) throw new FlowRequestError("conflict", 409);

  const { error: revokeError } = await context.admin.from("flow_approvals").update({
    decision: "revoked",
    decision_comment: "Publishing draft content changed after approval request.",
  }).eq("owner_user_id", context.user.id).eq("target_type", "publishing_draft")
    .eq("target_id", draftId).in("decision", ["pending", "approved"]);
  if (revokeError) throw new FlowRequestError("internal_error", 500);

  await writeFlowAudit(context, "publishing.draft_updated", "flow_publishing_draft", draftId, {
    platform: String(data.platform), revision: Number(data.revision), status: "draft",
  });
  return mapDraft(data);
}

Deno.serve(async (request: Request) => {
  const fallbackId = correlationId();
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin") ?? "";
    const headers: Record<string, string> = {
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
    };
    if (origin === "https://yossefahmedsamir00-ship-it.github.io") {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    const safe = toFlowError(new FlowRequestError("validation_error", 405));
    return jsonResponse(request, { ok: false, error: {
      code: safe.code, message: safe.message, correlationId: fallbackId,
    } }, safe.status);
  }

  try {
    assertAllowedOrigin(request);
    const body = await readJsonBody(request);
    const context = await getFlowContext(request);
    const action = requireEnum(body.action, "action", ["list", "create", "update", "publish"] as const);
    if (action === "publish") throw new FlowRequestError("not_configured", 503);

    const data = action === "list"
      ? await listDrafts(context)
      : action === "create"
        ? { draft: await createDraft(context, body) }
        : { draft: await updateDraft(context, body) };
    return jsonResponse(request, { ok: true, data, correlationId: context.requestId });
  } catch (error) {
    const safe = toFlowError(error);
    return jsonResponse(request, { ok: false, error: {
      code: safe.code, message: safe.message, correlationId: fallbackId,
    } }, safe.status);
  }
});
