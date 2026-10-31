import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  assertAllowedOrigin,
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

type Context = Awaited<ReturnType<typeof getFlowContext>>;
type Row = Record<string, unknown>;

function mapEntry(row: Row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    operationId: row.operation_id,
    entryType: row.entry_type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    source: row.source,
    status: row.status,
    evidenceReference: row.evidence_reference,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

async function listEntries(context: Context) {
  const { data, error } = await context.admin
    .from("flow_financial_entries")
    .select("*")
    .eq("owner_user_id", context.user.id)
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) throw new FlowRequestError("internal_error", 500);
  return { entries: (data ?? []).map(mapEntry) };
}

async function createEntry(context: Context, body: Record<string, unknown>) {
  const entryType = requireEnum(body.entryType, "entryType", ["income", "expense", "refund"] as const);
  const amountMinor = requireInteger(body.amountMinor, 1, 1_000_000_000_000);
  const currency = requireString(body.currency ?? "EGP", "currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new FlowRequestError("validation_error", 400);

  const source = requireEnum(body.source ?? "manual", "source", ["manual", "kashier", "provider_import", "other"] as const);
  if (source !== "manual" && source !== "other") {
    // Payment provider reconciliation is deliberately not enabled in this release.
    throw new FlowRequestError("not_configured", 503);
  }

  const status = requireEnum(
    body.status ?? "pending",
    "status",
    ["pending", "confirmed", "refunded", "estimated", "voided"] as const,
  );
  const evidenceReference =
    typeof body.evidenceReference === "string" && body.evidenceReference.trim()
      ? body.evidenceReference.trim().slice(0, 1000)
      : null;
  if (status === "confirmed" && !evidenceReference) {
    throw new FlowRequestError("validation_error", 400);
  }

  const operationId = body.operationId === undefined || body.operationId === null
    ? null
    : requireString(body.operationId, "operationId", 80);
  if (operationId) {
    const { data: operation, error } = await context.admin
      .from("flow_operations")
      .select("id")
      .eq("id", operationId)
      .eq("owner_user_id", context.user.id)
      .maybeSingle();
    if (error) throw new FlowRequestError("internal_error", 500);
    if (!operation) throw new FlowRequestError("not_found", 404);
  }

  const occurredAt = typeof body.occurredAt === "string" && body.occurredAt.trim()
    ? body.occurredAt.trim()
    : null;
  if (occurredAt && !Number.isFinite(Date.parse(occurredAt))) {
    throw new FlowRequestError("validation_error", 400);
  }

  const { data, error } = await context.admin
    .from("flow_financial_entries")
    .insert({
      owner_user_id: context.user.id,
      operation_id: operationId,
      entry_type: entryType,
      amount_minor: amountMinor,
      currency,
      source,
      status,
      evidence_reference: evidenceReference,
      occurred_at: occurredAt,
    })
    .select("*")
    .single();
  if (error) throw new FlowRequestError("internal_error", 500);

  await writeFlowAudit(context, "finance.entry_created", "flow_financial_entry", String(data.id), {
    entry_id: String(data.id),
    operation_id: operationId ?? "",
    amount_minor: amountMinor,
    currency,
    source,
    status,
  });
  return mapEntry(data);
}

Deno.serve(async (request: Request) => {
  const fallbackId = correlationId();
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin") ?? "";
    const headers: Record<string, string> = {
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    };
    if (origin === "https://yossefahmedsamir00-ship-it.github.io") {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return new Response(null, { status: 204, headers });
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
    const action = requireEnum(body.action, "action", ["list", "create"] as const);
    const data = action === "list"
      ? await listEntries(context)
      : { entry: await createEntry(context, body) };

    return jsonResponse(request, { ok: true, data, correlationId: context.requestId });
  } catch (error) {
    const safe = toFlowError(error);
    return jsonResponse(request, {
      ok: false,
      error: { code: safe.code, message: safe.message, correlationId: fallbackId },
    }, safe.status);
  }
});
