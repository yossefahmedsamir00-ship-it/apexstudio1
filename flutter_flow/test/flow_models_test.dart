import 'package:flutter_test/flutter_test.dart';

import '../lib/flow_models.dart';

void main() {
  test('workflow JSON round-trip preserves builder and execution modes', () {
    const workflow = FlowWorkflow(
      id: 'wf-1',
      name: 'Social Draft',
      version: 3,
      builderMode: FlowBuilderMode.hybrid,
      executionMode: FlowExecutionMode.semiAutomatic,
      nodes: [
        FlowNodeInstance(id: 'trigger', definition: flowStarterNodes[0]),
        FlowNodeInstance(id: 'publish', definition: flowStarterNodes[4]),
      ],
      edges: [FlowEdge(from: 'trigger', to: 'publish', condition: 'approved == true')],
    );

    final restored = FlowWorkflow.fromJson(workflow.toJson());

    expect(restored.id, workflow.id);
    expect(restored.version, 3);
    expect(restored.builderMode, FlowBuilderMode.hybrid);
    expect(restored.executionMode, FlowExecutionMode.semiAutomatic);
    expect(restored.nodes.length, 2);
    expect(restored.edges.single.condition, 'approved == true');
  });
}
