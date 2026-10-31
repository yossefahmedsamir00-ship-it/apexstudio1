import type { FlowContext } from "./flow-engine-auth.ts";

const SAFE_METADATA_KEYS = new Set([
  "revision",
  "target_type",
  "platform",
  "source",
  "status",
  "amount_minor",
  "currency",
  "decision",
  "operation_id",
  "request_id",
  "scene_id",
  "approval_id",
  "entry_id",
  "idempotency_key",
]);

export async function writeFlowAudit(
  context: FlowContext,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const safeMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SAFE_METADATA_KEYS.has(key) && (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    )) {
      safeMetadata[key] = value;
    }
  }

  const { error } = await context.admin.from("flow_audit_events").insert({
    owner_user_id: context.user.id,
    actor_user_id: context.user.id,
    action: action.slice(0, 100),
    target_type: targetType.slice(0, 80),
    target_id: targetId,
    correlation_id: context.requestId,
    metadata: safeMetadata,
  });
  if (error) throw new Error("flow_audit_write_failed");
}
