typedef JsonMap = Map<String, dynamic>;

String _string(JsonMap json, String key, [String fallback = '']) {
  final value = json[key];
  return value is String ? value : fallback;
}

int _integer(JsonMap json, String key, [int fallback = 0]) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  return fallback;
}

class FlowRequestModel {
  const FlowRequestModel({
    required this.id,
    required this.ownerUserId,
    required this.prompt,
    required this.locale,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String ownerUserId;
  final String prompt;
  final String locale;
  final String status;
  final String createdAt;

  factory FlowRequestModel.fromJson(JsonMap json) => FlowRequestModel(
        id: _string(json, 'id'),
        ownerUserId: _string(json, 'ownerUserId'),
        prompt: _string(json, 'prompt'),
        locale: _string(json, 'locale', 'ar'),
        status: _string(json, 'status', 'draft'),
        createdAt: _string(json, 'createdAt'),
      );
}

class FlowOperationModel {
  const FlowOperationModel({
    required this.id,
    required this.requestId,
    required this.ownerUserId,
    required this.title,
    required this.summary,
    required this.status,
    required this.progress,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String requestId;
  final String ownerUserId;
  final String title;
  final String summary;
  final String status;
  final int progress;
  final String createdAt;
  final String updatedAt;

  factory FlowOperationModel.fromJson(JsonMap json) => FlowOperationModel(
        id: _string(json, 'id'),
        requestId: _string(json, 'requestId'),
        ownerUserId: _string(json, 'ownerUserId'),
        title: _string(json, 'title'),
        summary: _string(json, 'summary'),
        status: _string(json, 'status', 'draft'),
        progress: _integer(json, 'progress'),
        createdAt: _string(json, 'createdAt'),
        updatedAt: _string(json, 'updatedAt'),
      );
}

class FlowVideoProjectModel {
  const FlowVideoProjectModel({
    required this.id,
    required this.ownerUserId,
    required this.operationId,
    required this.title,
    required this.brief,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String ownerUserId;
  final String? operationId;
  final String title;
  final String brief;
  final String status;
  final String createdAt;
  final String updatedAt;

  factory FlowVideoProjectModel.fromJson(JsonMap json) => FlowVideoProjectModel(
        id: _string(json, 'id'),
        ownerUserId: _string(json, 'ownerUserId'),
        operationId: json['operationId'] is String ? json['operationId'] as String : null,
        title: _string(json, 'title'),
        brief: _string(json, 'brief'),
        status: _string(json, 'status', 'planned'),
        createdAt: _string(json, 'createdAt'),
        updatedAt: _string(json, 'updatedAt'),
      );
}

class FlowSceneModel {
  const FlowSceneModel({
    required this.id,
    required this.projectId,
    required this.ownerUserId,
    required this.title,
    required this.brief,
    required this.script,
    required this.visualDirection,
    required this.status,
    required this.revision,
    required this.sortOrder,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String projectId;
  final String ownerUserId;
  final String title;
  final String brief;
  final String script;
  final String visualDirection;
  final String status;
  final int revision;
  final int sortOrder;
  final String createdAt;
  final String updatedAt;

  factory FlowSceneModel.fromJson(JsonMap json) => FlowSceneModel(
        id: _string(json, 'id'),
        projectId: _string(json, 'projectId'),
        ownerUserId: _string(json, 'ownerUserId'),
        title: _string(json, 'title'),
        brief: _string(json, 'brief'),
        script: _string(json, 'script'),
        visualDirection: _string(json, 'visualDirection'),
        status: _string(json, 'status', 'planned'),
        revision: _integer(json, 'revision', 1),
        sortOrder: _integer(json, 'sortOrder'),
        createdAt: _string(json, 'createdAt'),
        updatedAt: _string(json, 'updatedAt'),
      );
}

class FlowApprovalModel {
  const FlowApprovalModel({
    required this.id,
    required this.operationId,
    required this.action,
    required this.targetType,
    required this.targetId,
    required this.target,
    required this.contentRevision,
    required this.contentHash,
    required this.decision,
    required this.createdAt,
  });

  final String id;
  final String operationId;
  final String action;
  final String targetType;
  final String targetId;
  final String target;
  final int contentRevision;
  final String contentHash;
  final String decision;
  final String createdAt;

  factory FlowApprovalModel.fromJson(JsonMap json) => FlowApprovalModel(
        id: _string(json, 'id'),
        operationId: _string(json, 'operationId'),
        action: _string(json, 'action'),
        targetType: _string(json, 'targetType'),
        targetId: _string(json, 'targetId'),
        target: _string(json, 'target'),
        contentRevision: _integer(json, 'contentRevision'),
        contentHash: _string(json, 'contentHash'),
        decision: _string(json, 'decision', 'pending'),
        createdAt: _string(json, 'createdAt'),
      );
}

class FlowPublishingDraftModel {
  const FlowPublishingDraftModel({
    required this.id,
    required this.operationId,
    required this.platform,
    required this.title,
    required this.body,
    required this.contentHash,
    required this.revision,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String operationId;
  final String platform;
  final String title;
  final String body;
  final String contentHash;
  final int revision;
  final String status;
  final String createdAt;
  final String updatedAt;

  factory FlowPublishingDraftModel.fromJson(JsonMap json) => FlowPublishingDraftModel(
        id: _string(json, 'id'),
        operationId: _string(json, 'operationId'),
        platform: _string(json, 'platform'),
        title: _string(json, 'title'),
        body: _string(json, 'body'),
        contentHash: _string(json, 'contentHash'),
        revision: _integer(json, 'revision', 1),
        status: _string(json, 'status', 'draft'),
        createdAt: _string(json, 'createdAt'),
        updatedAt: _string(json, 'updatedAt'),
      );
}

class FlowFinancialEntryModel {
  const FlowFinancialEntryModel({
    required this.id,
    required this.operationId,
    required this.entryType,
    required this.amountMinor,
    required this.currency,
    required this.source,
    required this.status,
    required this.evidenceReference,
    required this.createdAt,
  });

  final String id;
  final String? operationId;
  final String entryType;
  final int amountMinor;
  final String currency;
  final String source;
  final String status;
  final String? evidenceReference;
  final String createdAt;

  factory FlowFinancialEntryModel.fromJson(JsonMap json) => FlowFinancialEntryModel(
        id: _string(json, 'id'),
        operationId: json['operationId'] is String ? json['operationId'] as String : null,
        entryType: _string(json, 'entryType'),
        amountMinor: _integer(json, 'amountMinor'),
        currency: _string(json, 'currency', 'EGP'),
        source: _string(json, 'source'),
        status: _string(json, 'status', 'pending'),
        evidenceReference: json['evidenceReference'] is String ? json['evidenceReference'] as String : null,
        createdAt: _string(json, 'createdAt'),
      );
}
