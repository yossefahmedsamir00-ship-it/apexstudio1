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

type RequestRow = Record<string, unknown>;
const responseError = (req: Request, code: string, message: string, status: number, correlation: string) =>
  jsonResponse(req, { ok: false, error: { code, message, correlationId: correlation } }, status);

function mapRequest(row: RequestRow) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    prompt: row.prompt,
    locale: row.locale,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapOperation(row: RequestRow) {
  return {
    id: row.id,
    requestId: row.request_id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findExisting(context: Awaited<ReturnType<typeof getFlowContext>>, idempotencyKey: string) {
  const { data: request, error } = await context.admin
    .from("flow_requests")
    .select("*")
    .eq("owner_user_id", context.user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw new FlowRequestError("internal_error", 500);
  if (!request) return null;
  const { data: operation, error: operationError } = await context.admin
    .from("flow_operations")
    .select("*")
    .eq("owner_user_id", context.user.id)
    .eq("request_id", request.id)
    .maybeSingle();
  if (operationError) throw new FlowRequestError("internal_error", 500);
  return { request: mapRequest(request), operation: operation ? mapOperation(operation) : null };
}

async function createRequest(
  context: Awaited<ReturnType<typeof getFlowContext>>,
  body: Record<string, unknown>,
) {
  const prompt = requireString(body.prompt, "prompt", 8000, 1);
  const locale = requireEnum(body.locale ?? "ar", "locale", ["ar", "en"] as const);
  const idempotencyKey = requireString(body.idempotencyKey, "idempotencyKey", 160, 8);

  const existing = await findExisting(context, idempotencyKey);
  if (existing) {
    if (existing.request.prompt !== prompt || existing.request.locale !== locale) {
      throw new FlowRequestError("conflict", 409);
    }
    return existing;
  }

  const { data: requestRow, error: requestError } = await context.admin
    .from("flow_requests")
    .insert({
      owner_user_id: context.user.id,
      prompt,
      locale,
      status: "draft",
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (requestError) {
    if (requestError.code === "23505") {
      const raced = await findExisting(context, idempotencyKey);
      if (raced) return raced;
    }
    throw new FlowRequestError("internal_error", 500);
  }

  const title = prompt.length > 160 ? prompt.slice(0, 157).trimEnd() + "..." : prompt;
  const { data: operationRow, error: operationError } = await context.admin
    .from("flow_operations")
    .insert({
      request_id: requestRow.id,
      owner_user_id: context.user.id,
      title,
      summary: "Review the proposed steps before execution.",
      status: "draft",
      progress: 0,
      correlation_id: context.requestId,
    })
    .select("*")
    .single();

  if (operationError) {
    await context.admin.from("flow_requests").delete()
      .eq("id", requestRow.id).eq("owner_user_id", context.user.id);
    throw new FlowRequestError("internal_error", 500);
  }

  await writeFlowAudit(context, "request.created", "flow_request", String(requestRow.id), {
    request_id: String(requestRow.id),
    operation_id: String(operationRow.id),
    idempotency_key: idempotencyKey,
    status: "draft",
  });

  return {
    request: mapRequest(requestRow),
    operation: mapOperation(operationRow),
  };
}

Deno.serve(async (request: Request) => {
  const correlation = correlationId();
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return responseError(request, "validation_error", "Only POST is supported.", 405, correlation);
  }

  try {
    assertAllowedOrigin(request);
    const body = await readJsonBody(request);
    const context = await getFlowContext(request);
    const action = requireEnum(body.action ?? "create", "action", ["create", "list", "get"] as const);

    if (action === "create") {
      const result = await createRequest(context, body);
      return jsonResponse(request, {
        ok: true,
        data: result,
        correlationId: context.requestId,
      });
    }

    if (action === "list") {
      const { data, error } = await context.admin
        .from("flow_requests")
        .select("*")
        .eq("owner_user_id", context.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new FlowRequestError("internal_error", 500);
      return jsonResponse(request, {
        ok: true,
        data: { requests: (data ?? []).map(mapRequest) },
        correlationId: context.requestId,
      });
    }

    const requestId = requireString(body.requestId, "requestId", 80);
    const { data: requestRow, error } = await context.admin
      .from("flow_requests")
      .select("*")
      .eq("id", requestId)
      .eq("owner_user_id", context.user.id)
      .maybeSingle();
    if (error) throw new FlowRequestError("internal_error", 500);
    if (!requestRow) throw new FlowRequestError("not_found", 404);
    const { data: operationRow, error: operationError } = await context.admin
      .from("flow_operations")
      .select("*")
      .eq("request_id", requestId)
      .eq("owner_user_id", context.user.id)
      .maybeSingle();
    if (operationError) throw new FlowRequestError("internal_error", 500);

    return jsonResponse(request, {
      ok: true,
      data: {
        request: mapRequest(requestRow),
        operation: operationRow ? mapOperation(operationRow) : null,
      },
      correlationId: context.requestId,
    });
  } catch (error) {
    const safe = toFlowError(error);
    return responseError(request, safe.code, safe.message, safe.status, correlation);
  }
});
