export interface WorkflowNode {
  id: string;
  type: string;
  version: number;
  config: Record<string, unknown>;
}
export interface WorkflowEdge {
  id: string;
  source: string;
  source_handle: string;
  target: string;
  target_handle: string;
}
export interface WorkflowDefinition {
  schema_version: number;
  workflow_id: string;
  name: string;
  trigger: { type: string; config: Record<string, unknown> };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: {
    mode: "manual" | "semi_automatic" | "automatic";
    require_approval_for_external_effects: boolean;
    max_node_executions: number;
    timeout_seconds: number;
  };
}
export interface ValidationIssue { code: string; path: string; }
export interface ValidationResult { valid: boolean; issues: ValidationIssue[]; }

const NODE_TYPES = new Set([
  "trigger.manual", "data.transform", "logic.condition", "ai.generate_text",
  "approval.request", "notification.in_app", "http.request",
  "social.create_draft", "social.publish"
]);
const EXTERNAL_EFFECT_TYPES = new Set(["http.request", "social.publish"]);
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateWorkflow(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (code: string, path: string) => issues.push({ code, path });
  if (!isRecord(input)) return { valid: false, issues: [{ code: "INVALID_WORKFLOW", path: "$" }] };

  if (input.schema_version !== 1) add("UNSUPPORTED_SCHEMA_VERSION", "schema_version");
  if (typeof input.workflow_id !== "string" || !input.workflow_id.trim()) add("INVALID_WORKFLOW_ID", "workflow_id");
  if (typeof input.name !== "string" || !input.name.trim()) add("INVALID_NAME", "name");
  if (!isRecord(input.trigger) || input.trigger.type !== "manual" || !isRecord(input.trigger.config)) {
    add("INVALID_TRIGGER", "trigger");
  }
  if (!Array.isArray(input.nodes) || input.nodes.length === 0) add("INVALID_NODES", "nodes");
  if (!Array.isArray(input.edges)) add("INVALID_EDGES", "edges");

  const nodes = Array.isArray(input.nodes) ? input.nodes : [];
  const edges = Array.isArray(input.edges) ? input.edges : [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!isRecord(node)) { add("INVALID_NODE", path); return; }
    if (typeof node.id !== "string" || !node.id.trim()) add("INVALID_NODE_ID", `${path}.id`);
    else if (nodeIds.has(node.id)) add("DUPLICATE_NODE_ID", `${path}.id`);
    else nodeIds.add(node.id);
    if (typeof node.type !== "string" || !NODE_TYPES.has(node.type)) add("UNSUPPORTED_NODE_TYPE", `${path}.type`);
    if (node.version !== 1) add("UNSUPPORTED_NODE_VERSION", `${path}.version`);
    if (!isRecord(node.config)) add("INVALID_NODE_CONFIG", `${path}.config`);
    if (node.type === "data.transform" && isRecord(node.config) && typeof node.config.template !== "string") {
      add("INVALID_NODE_CONFIG", `${path}.config.template`);
    }
  });

  edges.forEach((edge, index) => {
    const path = `edges[${index}]`;
    if (!isRecord(edge)) { add("INVALID_EDGE", path); return; }
    if (typeof edge.id !== "string" || !edge.id.trim()) add("INVALID_EDGE_ID", `${path}.id`);
    else if (edgeIds.has(edge.id)) add("DUPLICATE_EDGE_ID", `${path}.id`);
    else edgeIds.add(edge.id);
    if (typeof edge.source !== "string" || !nodeIds.has(edge.source)) add("UNKNOWN_EDGE_SOURCE", `${path}.source`);
    if (typeof edge.target !== "string" || !nodeIds.has(edge.target)) add("UNKNOWN_EDGE_TARGET", `${path}.target`);
    if (typeof edge.source_handle !== "string" || !edge.source_handle) add("INVALID_EDGE_HANDLE", `${path}.source_handle`);
    if (typeof edge.target_handle !== "string" || !edge.target_handle) add("INVALID_EDGE_HANDLE", `${path}.target_handle`);
  });

  if (!isRecord(input.settings)) add("INVALID_SETTINGS", "settings");
  else {
    const settings = input.settings;
    if (!["manual", "semi_automatic", "automatic"].includes(String(settings.mode))) add("INVALID_MODE", "settings.mode");
    if (typeof settings.require_approval_for_external_effects !== "boolean") add("INVALID_APPROVAL_POLICY", "settings.require_approval_for_external_effects");
    if (nodes.some(node => isRecord(node) && EXTERNAL_EFFECT_TYPES.has(String(node.type))) &&
        settings.require_approval_for_external_effects !== true) {
      add("APPROVAL_POLICY_REQUIRED", "settings.require_approval_for_external_effects");
    }
    if (!Number.isInteger(settings.max_node_executions) || Number(settings.max_node_executions) < 1 ||
        Number(settings.max_node_executions) > 1000) add("INVALID_EXECUTION_LIMIT", "settings.max_node_executions");
    if (!Number.isInteger(settings.timeout_seconds) || Number(settings.timeout_seconds) < 1 ||
        Number(settings.timeout_seconds) > 3600) add("INVALID_TIMEOUT", "settings.timeout_seconds");
  }
  return { valid: issues.length === 0, issues };
}
