import { validateWorkflow, type WorkflowDefinition } from "./workflow.js";

export type DryRunStatus = "completed" | "waiting_approval" | "blocked" | "invalid" | "limit_exceeded" | "failed";
export interface DryRunNodeResult {
  node_id: string;
  node_type: string;
  status: "completed" | "waiting_approval" | "blocked" | "failed";
  output?: unknown;
  error_code?: string;
}
export interface DryRunResult {
  status: DryRunStatus;
  node_runs: DryRunNodeResult[];
  outputs: Record<string, unknown>;
  issues: Array<{ code: string; path: string }>;
  external_effects_performed: false;
}

function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function renderTemplate(template: string, input: unknown, outputs: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(input|nodes)\.([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, root: string, path: string) => {
    const value = root === "input" ? readPath(input, path) : readPath(outputs, path);
    return value === undefined || value === null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  });
}

/**
 * A deterministic, local-only preview runner.
 * It intentionally has no network, database, secrets, scheduler, or publishing adapter.
 */
export async function runWorkflowDryRun(
  workflow: unknown,
  input: Record<string, unknown>
): Promise<DryRunResult> {
  const validation = validateWorkflow(workflow);
  const empty = (status: DryRunStatus, issues = validation.issues): DryRunResult => ({
    status, node_runs: [], outputs: {}, issues, external_effects_performed: false
  });
  if (!validation.valid) return empty("invalid");
  const definition = workflow as WorkflowDefinition;
  const start = definition.nodes.find((node) => node.type === "trigger.manual");
  if (!start) return empty("invalid", [{ code: "MANUAL_TRIGGER_NODE_REQUIRED", path: "nodes" }]);

  const byId = new Map(definition.nodes.map((node) => [node.id, node]));
  const queue: Array<{ nodeId: string; incoming: unknown }> = [{ nodeId: start.id, incoming: input }];
  const scheduled = new Set<string>([start.id]);
  const nodeRuns: DryRunNodeResult[] = [];
  const outputs: Record<string, unknown> = {};

  while (queue.length > 0) {
    if (nodeRuns.length >= definition.settings.max_node_executions) {
      return { status: "limit_exceeded", node_runs: nodeRuns, outputs, issues: [], external_effects_performed: false };
    }
    const current = queue.shift()!;
    const node = byId.get(current.nodeId);
    if (!node) continue;

    let output: unknown = current.incoming;
    let status: DryRunNodeResult["status"] = "completed";
    let errorCode: string | undefined;

    switch (node.type) {
      case "trigger.manual":
        output = input;
        break;
      case "data.transform":
        output = renderTemplate(String(node.config.template ?? ""), input, outputs);
        break;
      case "logic.condition": {
        const path = typeof node.config.input_path === "string" ? node.config.input_path : "";
        const actual = path ? readPath({ input, nodes: outputs }, path) : current.incoming;
        output = Boolean(actual);
        break;
      }
      case "ai.generate_text": {
        const prompt = typeof node.config.prompt === "string" ? renderTemplate(node.config.prompt, input, outputs) : "";
        output = { preview: true, provider: "mock", text: prompt ? `[AI preview] ${prompt}` : "[AI preview] Configure a prompt." };
        break;
      }
      case "approval.request":
        status = "waiting_approval";
        output = { approval_required: true, preview_only: true };
        break;
      case "notification.in_app":
        output = { preview: true, message: String(node.config.message ?? "Notification preview") };
        break;
      case "social.create_draft":
        output = {
          kind: "social_draft_preview",
          platform: String(node.config.platform ?? "unspecified"),
          text: typeof node.config.text === "string" ? renderTemplate(node.config.text, input, outputs) : ""
        };
        break;
      case "http.request":
      case "social.publish":
        status = "blocked";
        errorCode = "DRY_RUN_EXTERNAL_EFFECT_BLOCKED";
        output = { blocked: true, reason: "External actions are disabled in dry-run mode." };
        break;
      default:
        status = "failed";
        errorCode = "UNSUPPORTED_DRY_RUN_NODE";
    }

    const run: DryRunNodeResult = { node_id: node.id, node_type: node.type, status, output };
    if (errorCode) run.error_code = errorCode;
    nodeRuns.push(run);
    outputs[node.id] = output;

    if (status === "waiting_approval") {
      return { status: "waiting_approval", node_runs: nodeRuns, outputs, issues: [], external_effects_performed: false };
    }
    if (status === "blocked") {
      return { status: "blocked", node_runs: nodeRuns, outputs, issues: [], external_effects_performed: false };
    }
    if (status === "failed") {
      return { status: "failed", node_runs: nodeRuns, outputs, issues: [], external_effects_performed: false };
    }

    const outgoing = definition.edges.filter((edge) =>
      edge.source === node.id &&
      (node.type !== "logic.condition" || edge.source_handle === (output ? "true" : "false"))
    );
    for (const edge of outgoing) {
      if (!scheduled.has(edge.target)) {
        scheduled.add(edge.target);
        queue.push({ nodeId: edge.target, incoming: output });
      }
    }
  }

  return { status: "completed", node_runs: nodeRuns, outputs, issues: [], external_effects_performed: false };
}
