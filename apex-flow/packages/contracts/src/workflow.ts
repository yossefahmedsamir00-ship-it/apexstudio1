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

export interface ValidationIssue {
  code: string;
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateWorkflow(_input: unknown): ValidationResult {
  return { valid: false, issues: [{ code: "INVALID_WORKFLOW", path: "$" }] };
}
