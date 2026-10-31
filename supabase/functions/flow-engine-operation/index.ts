import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  assertAllowedOrigin,
  corsHeaders,
  correlationId,
  FlowRequestError,
  jsonResponse,
  readJsonBody,
  requireEnum,
  requireInteger,
  requireString,
  toFlowError,
} from "../_shared/flow-engine-contracts.ts";
import { getFlowContext } from "../_shared/flow-engine-auth.ts";
import { writeFlowAudit } from "../_shared/flow-engine-audit.ts";

type Row = Record<string, unknown>;
const errorResponse = (request: Request, error: unknown, fallbackId: string) => {
  const safe = toFlowError(error);
  return jsonResponse(request, {
    ok: false,
    error: { code: safe.code, message: safe.message, correlationId: fallbackId },
  }, safe.status);
};

function mapOperation(row: Row) {
  return {
    id: row.id,
    requestId: row.request_id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    progress: row.progress,
    errorCode: row.error_code ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: Row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    operationId: row.operation_id,
    title: row.title,
    brief: row.brief,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapScene(row: Row) {
  return {
    id: row.id,
    projectId: row.project_id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    brief: row.brief,
    script: row.script,
    visualDirection: row.visual_direction,
    status: row.status,
    revision: row.revision,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listOperations(context: Awaited<ReturnType<typeof getFlowContext>>) {
  const { data, error } = await context.admin
    .from("flow_operations")
    .select("*")
    .eq("owner_user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new FlowRequestError("internal_error", 500);
  return { operations: (data ?? []).map(mapOperation) };
}

async function getOperation(
  context: Awaited<ReturnType<typeof getFlowContext>>,
  operationId: string,
) {
  const { data: operation, error } = await context.admin
    .from("flow_operations")
    .select("*")
    .eq("id", operationId)
    .eq("owner_user_id", context.user.id)
    .maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!operation) throw new FlowRequestError("not_found", 404);

  const { data: steps, error: stepError } = await context.admin
    .from("flow_operation_steps")
    .select("*")
    .eq("operation_id", operationId)
    .eq("owner_user_id", context.user.id)
    .order("step_order", { ascending: true });
  if (stepError) throw new FlowRequestError("internal_error", 500);

  return {
    operation: mapOperation(operation),
    steps: (steps ?? []).map((step: Row) => ({
      id: step.id,
      operationId: step.operation_id,
      title: step.title,
      description: step.description,
      status: step.status,
      stepOrder: step.step_order,
      dependsOn: step.depends_on,
      resultSummary: step.result_summary,
      errorCode: step.error_code,
    })),
  };
}

async function cancelOperation(
  context: Awaited<ReturnType<typeof getFlowContext>>,
  operationId: string,
) {
  const { data, error } = await context.admin
    .from("flow_operations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", operationId)
    .eq("owner_user_id", context.user.id)
    .in("status", ["draft", "queued"])
    .select("*")
    .maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!data) throw new FlowRequestError("conflict", 409);
  await writeFlowAudit(context, "operation.cancelled", "flow_operation", String(data.id), {
    operation_id: String(data.id),
    status: "cancelled",
  });
  return mapOperation(data);
}

async function createProject(
  context: Awaited<ReturnType<typeof getFlowContext>>,
  body: Record<string, unknown>,
) {
  const operationId = requireString(body.operationId, "operationId", 80);
  const title = requireString(body.title, "title", 160);
  const brief = typeof body.brief === "string" ? body.brief.trim().slice(0, 8000) : "";

  const { data: operation, error: operationError } = await context.admin
    .from("flow_operations")
    .select("id")
    .eq("id", operationId)
    .eq("owner_user_id", context.user.id)
    .maybeSingle();
  if (operationError) throw new FlowRequestError("internal_error", 500);
  if (!operation) throw new FlowRequestError("not_found", 404);

  const { data, error } = await context.admin
    .from("flow_video_projects")
    .insert({
      owner_user_id: context.user.id,
      operation_id: operationId,
      title,
      brief,
      status: "planned",
    })
    .select("*")
    .single();
  if (error) throw new FlowRequestError("internal_error", 500);

  await writeFlowAudit(context, "video_project.created", "flow_video_project", String(data.id), {
    operation_id: operationId,
    status: "planned",
  });
  return mapProject(data);
}

async function createScene(
  context: Awaited<ReturnType<typeof getFlowContext>>,
  body: Record<string, unknown>,
) {
  const projectId = requireString(body.projectId, "projectId", 80);
  const title = requireString(body.title, "title", 160);
  const brief = typeof body.brief === "string" ? body.brief.trim().slice(0, 4000) : "";
  const script = typeof body.script === "string" ? body.script.slice(0, 12000) : "";
  const visualDirection = typeof body.visualDirection === "string"
    ? body.visualDirection.slice(0, 4000)
    : "";
  const sortOrder = requireInteger(body.sortOrder ?? 0, 0, 10000);

  const { data: project, error: projectError } = await context.admin
    .from("flow_video_projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_user_id", context.user.id)
    .maybeSingle();
  if (projectError) throw new FlowRequestError("internal_error", 500);
  if (!project) throw new FlowRequestError("not_found", 404);

  const { data, error } = await context.admin
    .from("flow_scenes")
    .insert({
      project_id: projectId,
      owner_user_id: context.user.id,
      title,
      brief,
      script,
      visual_direction: visualDirection,
      status: "planned",
      revision: 1,
      sort_order: sortOrder,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new FlowRequestError("conflict", 409);
    throw new FlowRequestError("internal_error", 500);
  }

  await writeFlowAudit(context, "scene.created", "flow_scene", String(data.id), {
    scene_id: String(data.id),
    revision: 1,
    status: "planned",
  });
  return mapScene(data);
}

async function updateScene(
  context: Awaited<ReturnType<typeof getFlowContext>>,
  body: Record<string, unknown>,
) {
  const sceneId = requireString(body.sceneId, "sceneId", 80);
  const { data: current, error: readError } = await context.admin
    .from("flow_scenes")
    .select("*")
    .eq("id", sceneId)
    .eq("owner_user_id", context.user.id)
    .maybeSingle();
  if (readError) throw new FlowRequestError("internal_error", 500);
  if (!current) throw new FlowRequestError("not_found", 404);

  const patch: Record<string, unknown> = {};
  const fields: Array<[string, string, number]> = [
    ["title", "title", 160],
    ["brief", "brief", 4000],
    ["script", "script", 12000],
    ["visualDirection", "visual_direction", 4000],
  ];
  let contentChanged = false;
  for (const [inputKey, column, limit] of fields) {
    if (body[inputKey] !== undefined) {
      if (typeof body[inputKey] !== "string" || (body[inputKey] as string).length > limit) {
        throw new FlowRequestError("validation_error", 400);
      }
      const value = (body[inputKey] as string).trim();
      patch[column] = value;
      if (value !== String(current[column] ?? "")) contentChanged = true;
    }
  }

  if (body.status !== undefined) {
    patch.status = requireEnum(
      body.status,
      "status",
      ["planned", "drafting", "ready_for_review"] as const,
    );
  }

  if (contentChanged) {
    patch.revision = Number(current.revision) + 1;
    patch.status = "drafting";
  }
  if (Object.keys(patch).length === 0) return mapScene(current);

  patch.updated_at = new Date().toISOString();
  const { data, error } = await context.admin
    .from("flow_scenes")
    .update(patch)
    .eq("id", sceneId)
    .eq("owner_user_id", context.user.id)
    .eq("revision", current.revision)
    .select("*")
    .maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!data) throw new FlowRequestError("conflict", 409);

  if (contentChanged) {
    const { error: revokeError } = await context.admin
      .from("flow_approvals")
      .update({
        decision: "revoked",
        decision_comment: "Scene content changed after approval request.",
      })
      .eq("owner_user_id", context.user.id)
      .eq("target_type", "scene")
      .eq("target_id", sceneId)
      .in("decision", ["pending", "approved"]);
    if (revokeError) throw new FlowRequestError("internal_error", 500);
  }

  await writeFlowAudit(context, "scene.updated", "flow_scene", sceneId, {
    scene_id: sceneId,
    revision: Number(data.revision),
    status: String(data.status),
  });
  return mapScene(data);
}


async function listProjects(context: Awaited<ReturnType<typeof getFlowContext>>) {
  const { data, error } = await context.admin.from("flow_video_projects")
    .select("*").eq("owner_user_id", context.user.id)
    .order("updated_at", { ascending: false }).limit(100);
  if (error) throw new FlowRequestError("internal_error", 500);
  return { projects: (data ?? []).map(mapProject) };
}

async function listScenes(context: Awaited<ReturnType<typeof getFlowContext>>, projectId: string) {
  const { data: project, error: projectError } = await context.admin.from("flow_video_projects")
    .select("id").eq("id", projectId).eq("owner_user_id", context.user.id).maybeSingle();
  if (projectError) throw new FlowRequestError("internal_error", 500);
  if (!project) throw new FlowRequestError("not_found", 404);
  const { data, error } = await context.admin.from("flow_scenes").select("*")
    .eq("project_id", projectId).eq("owner_user_id", context.user.id)
    .order("sort_order", { ascending: true });
  if (error) throw new FlowRequestError("internal_error", 500);
  return { scenes: (data ?? []).map(mapScene) };
}

Deno.serve(async (request: Request) => {
  const fallbackId = correlationId();
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return errorResponse(request, new FlowRequestError("validation_error", 405), fallbackId);
  }

  try {
    assertAllowedOrigin(request);
    const body = await readJsonBody(request);
    const context = await getFlowContext(request);
    const action = requireEnum(
      body.action,
      "action",
      ["list", "get", "cancel", "projects.list", "scenes.list", "project.create", "scene.create", "scene.update"] as const,
    );
    let data: unknown;

    if (action === "list") {
      data = await listOperations(context);
    } else if (action === "projects.list") {
      data = await listProjects(context);
    } else if (action === "scenes.list") {
      data = await listScenes(context, requireString(body.projectId, "projectId", 80));
    } else if (action === "get") {
      data = await getOperation(context, requireString(body.operationId, "operationId", 80));
    } else if (action === "cancel") {
      data = { operation: await cancelOperation(
        context,
        requireString(body.operationId, "operationId", 80),
      ) };
    } else if (action === "project.create") {
      data = { project: await createProject(context, body) };
    } else if (action === "scene.create") {
      data = { scene: await createScene(context, body) };
    } else {
      data = { scene: await updateScene(context, body) };
    }

    return jsonResponse(request, {
      ok: true,
      data,
      correlationId: context.requestId,
    });
  } catch (error) {
    return errorResponse(request, error, fallbackId);
  }
});
