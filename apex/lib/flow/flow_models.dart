enum FlowBuilderMode { visual, simple, hybrid }

enum FlowExecutionMode { manual, semiAutomatic, automatic }

enum FlowRunStatus { queued, running, waitingApproval, paused, failed, cancelled, completed }

class FlowNodeDefinition {
  const FlowNodeDefinition({required this.type, required this.title, required this.category});

  final String type;
  final String title;
  final String category;

  Map<String, dynamic> toJson() => {'type': type, 'title': title, 'category': category};

  factory FlowNodeDefinition.fromJson(Map<String, dynamic> json) => FlowNodeDefinition(
        type: json['type'] as String,
        title: json['title'] as String,
        category: json['category'] as String,
      );
}

class FlowNodeInstance {
  const FlowNodeInstance({required this.id, required this.definition, this.config = const {}});

  final String id;
  final FlowNodeDefinition definition;
  final Map<String, dynamic> config;

  Map<String, dynamic> toJson() => {
        'id': id,
        'definition': definition.toJson(),
        'config': config,
      };

  factory FlowNodeInstance.fromJson(Map<String, dynamic> json) => FlowNodeInstance(
        id: json['id'] as String,
        definition: FlowNodeDefinition.fromJson(Map<String, dynamic>.from(json['definition'] as Map)),
        config: Map<String, dynamic>.from((json['config'] as Map?) ?? const {}),
      );
}

class FlowEdge {
  const FlowEdge({required this.from, required this.to, this.condition});

  final String from;
  final String to;
  final String? condition;

  Map<String, dynamic> toJson() => {'from': from, 'to': to, if (condition != null) 'condition': condition};

  factory FlowEdge.fromJson(Map<String, dynamic> json) => FlowEdge(
        from: json['from'] as String,
        to: json['to'] as String,
        condition: json['condition'] as String?,
      );
}

class FlowWorkflow {
  const FlowWorkflow({
    required this.id,
    required this.name,
    required this.version,
    required this.builderMode,
    required this.executionMode,
    required this.nodes,
    required this.edges,
  });

  final String id;
  final String name;
  final int version;
  final FlowBuilderMode builderMode;
  final FlowExecutionMode executionMode;
  final List<FlowNodeInstance> nodes;
  final List<FlowEdge> edges;

  FlowWorkflow copyWith({
    String? name,
    int? version,
    FlowBuilderMode? builderMode,
    FlowExecutionMode? executionMode,
    List<FlowNodeInstance>? nodes,
    List<FlowEdge>? edges,
  }) => FlowWorkflow(
        id: id,
        name: name ?? this.name,
        version: version ?? this.version,
        builderMode: builderMode ?? this.builderMode,
        executionMode: executionMode ?? this.executionMode,
        nodes: nodes ?? this.nodes,
        edges: edges ?? this.edges,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'version': version,
        'builderMode': builderMode.name,
        'executionMode': executionMode.name,
        'nodes': nodes.map((node) => node.toJson()).toList(),
        'edges': edges.map((edge) => edge.toJson()).toList(),
      };

  factory FlowWorkflow.fromJson(Map<String, dynamic> json) => FlowWorkflow(
        id: json['id'] as String,
        name: json['name'] as String,
        version: json['version'] as int,
        builderMode: FlowBuilderMode.values.byName(json['builderMode'] as String),
        executionMode: FlowExecutionMode.values.byName(json['executionMode'] as String),
        nodes: (json['nodes'] as List)
            .map((node) => FlowNodeInstance.fromJson(Map<String, dynamic>.from(node as Map)))
            .toList(),
        edges: (json['edges'] as List)
            .map((edge) => FlowEdge.fromJson(Map<String, dynamic>.from(edge as Map)))
            .toList(),
      );
}

class FlowRunSummary {
  const FlowRunSummary({required this.id, required this.workflowVersion, required this.status});

  final String id;
  final int workflowVersion;
  final FlowRunStatus status;
}

const flowStarterNodes = <FlowNodeDefinition>[
  FlowNodeDefinition(type: 'trigger.manual', title: 'Manual Trigger', category: 'Triggers'),
  FlowNodeDefinition(type: 'ai.generate', title: 'AI Generate', category: 'AI'),
  FlowNodeDefinition(type: 'logic.condition', title: 'Condition', category: 'Logic'),
  FlowNodeDefinition(type: 'social.approval', title: 'Owner Approval', category: 'Social'),
  FlowNodeDefinition(type: 'social.publish', title: 'Publish', category: 'Social'),
];
