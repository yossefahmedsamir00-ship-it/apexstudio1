import { describe, expect, it } from "vitest";
import { runWorkflowDryRun } from "../src/dry-run.js";
import type { WorkflowDefinition } from "../src/workflow.js";

const workflow: WorkflowDefinition = {
  schema_version: 1,
  workflow_id: "dry-run-demo",
  name: "Dry run demo",
  trigger: { type: "manual", config: {} },
  nodes: [
    { id: "start", type: "trigger.manual", version: 1, config: {} },
    { id: "format", type: "data.transform", version: 1, config: { template: "Hello {{input.name}}" } },
    { id: "draft", type: "social.create_draft", version: 1, config: { platform: "instagram", text: "{{nodes.format}}" } }
  ],
  edges: [
    { id: "e1", source: "start", source_handle: "success", target: "format", target_handle: "input" },
    { id: "e2", source: "format", source_handle: "success", target: "draft", target_handle: "input" }
  ],
  settings: {
    mode: "manual",
    require_approval_for_external_effects: true,
    max_node_executions: 20,
    timeout_seconds: 30
  }
};

describe("runWorkflowDryRun", () => {
  it("executes deterministic local nodes and creates a draft preview", async () => {
    const result = await runWorkflowDryRun(workflow, { name: "Youssef" });
    expect(result.status).toBe("completed");
    expect(result.node_runs.map((run) => run.status)).toEqual(["completed", "completed", "completed"]);
    expect(result.outputs.draft).toMatchObject({
      kind: "social_draft_preview",
      platform: "instagram",
      text: "Hello Youssef"
    });
    expect(result.external_effects_performed).toBe(false);
  });

  it("stops safely at an approval node", async () => {
    const input: WorkflowDefinition = {
      ...workflow,
      nodes: [...workflow.nodes.slice(0, 2), { id: "approval", type: "approval.request", version: 1, config: {} }],
      edges: workflow.edges.slice(0, 1).concat({
        id: "e2", source: "format", source_handle: "success", target: "approval", target_handle: "input"
      })
    };
    const result = await runWorkflowDryRun(input, { name: "Test" });
    expect(result.status).toBe("waiting_approval");
    expect(result.node_runs.at(-1)?.status).toBe("waiting_approval");
  });

  it("never performs HTTP or social publishing in dry-run mode", async () => {
    const input: WorkflowDefinition = {
      ...workflow,
      nodes: [workflow.nodes[0], { id: "publish", type: "social.publish", version: 1, config: {} }],
      edges: [{ id: "e1", source: "start", source_handle: "success", target: "publish", target_handle: "input" }]
    };
    const result = await runWorkflowDryRun(input, {});
    expect(result.status).toBe("blocked");
    expect(result.external_effects_performed).toBe(false);
    expect(result.node_runs.at(-1)?.error_code).toBe("DRY_RUN_EXTERNAL_EFFECT_BLOCKED");
  });

  it("rejects invalid workflows before execution", async () => {
    const result = await runWorkflowDryRun({ ...workflow, edges: [{ ...workflow.edges[0], target: "missing" }] }, {});
    expect(result.status).toBe("invalid");
    expect(result.node_runs).toHaveLength(0);
  });

  it("enforces the configured node execution limit", async () => {
    const input = { ...workflow, settings: { ...workflow.settings, max_node_executions: 1 } };
    const result = await runWorkflowDryRun(input, { name: "Test" });
    expect(result.status).toBe("limit_exceeded");
  });
});
