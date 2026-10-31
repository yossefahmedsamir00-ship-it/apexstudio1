import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  assertAllowedOrigin,
  corsHeaders,
  correlationId,
  FlowRequestError,
  jsonResponse,
  readJsonBody,
  requireEnum,
  requireString,
  toFlowError,
} from "../_shared/flow-engine-contracts.ts";
import { getFlowContext } from "../_shared/flow-engine-auth.ts";
import { writeFlowAudit } from "../_shared/flow-engine-audit.ts";

type Context = Awaited<ReturnType<typeof getFlowContext>>;
type Row = Record<string, unknown>;

const TARGET_TYPES = ["scene", "publishing_draft"] as const;
const DECISIONS = ["approved", "rejected"] as const;

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function mapApproval(row: Row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    operationId: row.operation_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    target: row.target,
    contentRevision: row.content_revision,
    contentHash: row.content_hash,
    decision: row.decision,
    decisionComment: row.decision_comment,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

async function getOperation(context: Context, operationId: string) {
  const { data, error } = await context.admin
    .from("flow_operations")
    .select("id")
    .eq("id", operationId)
    .eq("owner_user_id", context.user.id)
    .maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!data) throw new FlowRequestError("not_found", 404);
}

async function snapshotTarget(
  context: Context,
  targetType: typeof TARGET_TYPES[number],
  targetId: string,
  operationId: string,
) {
  if (targetType === "scene") {
    const { data: scene, error } = await context.admin
      .from("flow_scenes")
      .select("id,project_id,title,brief,script,visual_direction,revision")
      .eq("id", targetId)
      .eq("owner_user_id", context.user.id)
      .maybeSingle();
    if (error) throw new FlowRequestError("internal_error", 500);
    if (!scene) throw new FlowRequestError("not_found", 404);

    const { data: project, error: projectError } = await context.admin
      .from("flow_video_projects")
      .select("operation_id")
      .eq("id", scene.project_id)
      .eq("owner_user_id", context.user.id)
      .maybeSingle();
    if (projectError) throw new FlowRequestError("internal_error", 500);
    if (!project || project.operation_id !== operationId) {
      throw new FlowRequestError("forbidden", 403);
    }

    const content = {
      title: scene.title,
      brief: scene.brief,
      script: scene.script,
      visualDirection: scene.visual_direction,
    };
    return {
      target: `scene:${scene.id}`,
      revision: Number(scene.revision),
      contentHash: await sha256(content),
    };
  }

  const { data: draft, error } = await context.admin
    .from("flow_publishing_drafts")
    .select("id,operation_id,platform,title,body,content_hash,revision")
    .eq("id", targetId)
    .eq("owner_user_id", context.user.id)
    .maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!draft) throw new FlowRequestError("not_found", 404);
  if (draft.operation_id !== operationId) throw new FlowRequestError("forbidden", 403);

  const content = { title: draft.title, body: draft.body };
  const actualHash = await sha256(content);
  if (actualHash !== draft.content_hash) throw new FlowRequestError("conflict", 409);
  return {
    target: `${draft.platform}:${draft.platform}`,
    revision: Number(draft.revision),
    contentHash: actualHash,
  };
}

async function listApprovals(context: Context) {
  const { data, error } = await context.admin
    .from("flow_approvals")
    .select("*")
    .eq("owner_user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new FlowRequestError("internal_error", 500);
  return { approvals: (data ?? []).map(mapApproval) };
}

async function requestApproval(context: Context, body: Record<string, unknown>) {
  const operationId = requireString(body.operationId, "operationId", 80);
  const targetType = requireEnum(body.targetType, "targetType", TARGET_TYPES);
  const targetId = requireString(body.targetId, "targetId", 80);
  const operationAction = requireEnum(
    body.operationAction,
    "operationAction",
    ["approve_scene", "publish"] as const,
  );
  if (targetType === "scene" && operationAction !== "approve_scene") {
    throw new FlowRequestError("validation_error", 400);
  }
  if (targetType === "publishing_draft" && operationAction !== "publish") {
    throw new FlowRequestError("validation_error", 400);
  }

  await getOperation(context, operationId);
  const snapshot = await snapshotTarget(context, targetType, targetId, operationId);

  const { data: approval, error } = await context.admin
    .from("flow_approvals")
    .insert({
      owner_user_id: context.user.id,
      operation_id: operationId,
      action: operationAction,
      target_type: targetType,
      target_id: targetId,
      target: snapshot.target,
      content_revision: snapshot.revision,
      content_hash: snapshot.contentHash,
      decision: "pending",
    })
    .select("*")
    .single();
  if (error) throw new FlowRequestError("internal_error", 500);

  if (targetType === "scene") {
    const { error: targetUpdateError } = await context.admin.from("flow_scenes")
      .update({ status: "ready_for_review" })
      .eq("id", targetId).eq("owner_user_id", context.user.id)
      .eq("revision", snapshot.revision);
    if (targetUpdateError) throw new FlowRequestError("internal_error", 500);
  } else {
    const { error: targetUpdateError } = await context.admin.from("flow_publishing_drafts")
      .update({ status: "awaiting_approval" })
      .eq("id", targetId).eq("owner_user_id", context.user.id)
      .eq("revision", snapshot.revision);
    if (targetUpdateError) throw new FlowRequestError("internal_error", 500);
  }

  await writeFlowAudit(context, "approval.requested", "flow_approval", String(approval.id), {
    approval_id: String(approval.id),
    operation_id: operationId,
    target_type: targetType,
    revision: snapshot.revision,
    status: "pending",
  });
  return mapApproval(approval);
}

async function decideApproval(context: Context, body: Record<string, unknown>) {
  const approvalId = requireString(body.approvalId, "approvalId", 80);
  const decision = requireEnum(body.decision, "decision", DECISIONS);
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : null;

  const { data: approval, error: approvalError } = await context.admin
    .from("flow_approvals")
    .select("*")
    .eq("id", approvalId)
    .eq("owner_user_id", context.user.id)
    .maybeSingle();
  if (approvalError) throw new FlowRequestError("internal_error", 500);
  if (!approval) throw new FlowRequestError("not_found", 404);
  if (approval.decision !== "pending") throw new FlowRequestError("conflict", 409);

  const snapshot = await snapshotTarget(
    context,
    approval.target_type,
    String(approval.target_id),
    String(approval.operation_id),
  );
  if (
    snapshot.target !== approval.target ||
    snapshot.revision !== Number(approval.content_revision) ||
    snapshot.contentHash !== approval.content_hash
  ) {
    const { error: revokeError } = await context.admin
      .from("flow_approvals")
      .update({
        decision: "revoked",
        decision_comment: "The approved target or content changed before the decision.",
      })
      .eq("id", approvalId)
      .eq("owner_user_id", context.user.id)
      .eq("decision", "pending");
    if (revokeError) throw new FlowRequestError("internal_error", 500);
    throw new FlowRequestError("conflict", 409);
  }

  const { data, error } = await context.admin
    .from("flow_approvals")
    .update({
      decision,
      decision_comment: comment,
      decided_by: context.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("owner_user_id", context.user.id)
    .eq("decision", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!data) throw new FlowRequestError("conflict", 409);

  if (approval.target_type === "scene") {
    const { error: statusError } = await context.admin.from("flow_scenes")
      .update({ status: decision === "approved" ? "approved" : "drafting" })
      .eq("id", approval.target_id).eq("owner_user_id", context.user.id)
      .eq("revision", approval.content_revision);
    if (statusError) throw new FlowRequestError("internal_error", 500);
  } else {
    const { error: statusError } = await context.admin.from("flow_publishing_drafts")
      .update({ status: decision === "approved" ? "approved" : "draft" })
      .eq("id", approval.target_id).eq("owner_user_id", context.user.id)
      .eq("revision", approval.content_revision);
    if (statusError) throw new FlowRequestError("internal_error", 500);
  }

  await writeFlowAudit(context, `approval.${decision}`, "flow_approval", approvalId, {
    approval_id: approvalId,
    target_type: String(approval.target_type),
    revision: Number(approval.content_revision),
    decision,
  });
  return mapApproval(data);
}

Deno.serve(async (request: Request) => {
  const fallbackId = correlationId();
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    const safe = toFlowError(new FlowRequestError("validation_error", 405));
    return jsonResponse(request, {
      ok: false,
      error: { code: safe.code, message: safe.message, correlationId: fallbackId },
    }, safe.status);
  }

  try {
    assertAllowedOrigin(request);
    const body = await readJsonBody(request);
    const context = await getFlowContext(request);
    const action = requireEnum(body.action, "action", ["list", "request", "decide"] as const);
    let data: unknown;
    if (action === "list") data = await listApprovals(context);
    else if (action === "request") data = { approval: await requestApproval(context, body) };
    else data = { approval: await decideApproval(context, body) };

    return jsonResponse(request, { ok: true, data, correlationId: context.requestId });
  } catch (error) {
    const safe = toFlowError(error);
    return jsonResponse(request, {
      ok: false,
      error: { code: safe.code, message: safe.message, correlationId: fallbackId },
    }, safe.status);
  }
});
