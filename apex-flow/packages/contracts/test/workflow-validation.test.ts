import { describe, expect, it } from "vitest";
import { validateWorkflow, type WorkflowDefinition } from "../src/workflow.js";

const validWorkflow: WorkflowDefinition = {
  schema_version: 1,
  workflow_id: "workflow-1",
  name: "A safe starter",
  trigger: { type: "manual", config: {} },
  nodes: [
    { id: "start", type: "trigger.manual", version: 1, config: {} },
    { id: "transform", type: "data.transform", version: 1, config: { template: "hello" } }
  ],
  edges: [
    { id: "edge-1", source: "start", source_handle: "success", target: "transform", target_handle: "input" }
  ],
  settings: {
    mode: "manual",
    require_approval_for_external_effects: true,
    max_node_executions: 20,
    timeout_seconds: 30
  }
};

describe("validateWorkflow", () => {
  it("accepts a valid manual trigger-to-transform graph", () => {
    expect(validateWorkflow(validWorkflow)).toEqual({ valid: true, issues: [] });
  });

  it("rejects duplicate node IDs with a stable issue code and path", () => {
    const input = {
      ...validWorkflow,
      nodes: [...validWorkflow.nodes, { ...validWorkflow.nodes[1] }]
    };
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "DUPLICATE_NODE_ID",
      path: "nodes[2].id"
    });
  });

  it("rejects edges whose endpoints do not exist", () => {
    const input = {
      ...validWorkflow,
      edges: [{ ...validWorkflow.edges[0], target: "missing" }]
    };
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "UNKNOWN_EDGE_TARGET",
      path: "edges[0].target"
    });
  });

  it("rejects unsupported node types", () => {
    const input = {
      ...validWorkflow,
      nodes: [{ ...validWorkflow.nodes[0], type: "code.execute" }, validWorkflow.nodes[1]]
    };
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "UNSUPPORTED_NODE_TYPE",
      path: "nodes[0].type"
    });
  });

  it("rejects external-effect nodes when approval policy is disabled", () => {
    const input = {
      ...validWorkflow,
      nodes: [
        validWorkflow.nodes[0],
        { id: "publish", type: "social.publish", version: 1, config: {} }
      ],
      edges: [
        { id: "edge-1", source: "start", source_handle: "success", target: "publish", target_handle: "input" }
      ],
      settings: { ...validWorkflow.settings, require_approval_for_external_effects: false }
    };
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "APPROVAL_POLICY_REQUIRED",
      path: "settings.require_approval_for_external_effects"
    });
  });

  it("rejects cyclic graphs before they can execute", () => {
    const input = {
      ...validWorkflow,
      edges: [
        validWorkflow.edges[0],
        { id: "edge-2", source: "transform", source_handle: "success", target: "start", target_handle: "input" }
      ]
    };
    expect(validateWorkflow(input).issues).toContainEqual({
      code: "WORKFLOW_CYCLE_NOT_SUPPORTED",
      path: "edges"
    });
  });

  it("rejects malformed input without throwing", () => {
    const result = validateWorkflow(null);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "INVALID_WORKFLOW",
      path: "$"
    });
  });
});
