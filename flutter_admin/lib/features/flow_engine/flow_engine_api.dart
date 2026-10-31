import 'package:supabase_flutter/supabase_flutter.dart';

import 'flow_engine_models.dart';

class FlowEngineException implements Exception {
  const FlowEngineException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}

class FlowEngineApi {
  FlowEngineApi(this._client);

  final SupabaseClient _client;

  Future<JsonMap> _invoke(String functionName, JsonMap body) async {
    try {
      final response = await _client.functions.invoke(functionName, body: body);
      final data = response.data;
      if (response.status < 200 || response.status >= 300) {
        throw const FlowEngineException('The Flow Engine request was denied.');
      }
      if (data is! Map) {
        throw const FlowEngineException('The Flow Engine returned an invalid response.');
      }
      final envelope = Map<String, dynamic>.from(data);
      if (envelope['ok'] != true) {
        final error = envelope['error'];
        if (error is Map) {
          final safe = Map<String, dynamic>.from(error);
          throw FlowEngineException(
            safe['message'] is String
                ? safe['message'] as String
                : 'The Flow Engine request could not be completed.',
            code: safe['code'] is String ? safe['code'] as String : null,
          );
        }
        throw const FlowEngineException('The Flow Engine request could not be completed.');
      }
      final result = envelope['data'];
      if (result is! Map) {
        throw const FlowEngineException('The Flow Engine returned an invalid response.');
      }
      return Map<String, dynamic>.from(result);
    } on FlowEngineException {
      rethrow;
    } catch (_) {
      // Keep provider errors, tokens and backend internals out of Flutter UI.
      throw const FlowEngineException('The Flow Engine service could not be reached.');
    }
  }

  List<T> _list<T>(
    JsonMap data,
    String key,
    T Function(JsonMap json) parse,
  ) {
    final values = data[key];
    if (values is! List) return const [];
    return values
        .whereType<Map>()
        .map((value) => parse(Map<String, dynamic>.from(value)))
        .toList(growable: false);
  }

  Future<({FlowRequestModel request, FlowOperationModel operation})> createRequest({
    required String prompt,
    required String locale,
    required String idempotencyKey,
  }) async {
    final result = await _invoke('flow-engine-request', {
      'action': 'create',
      'prompt': prompt,
      'locale': locale,
      'idempotencyKey': idempotencyKey,
    });
    final request = result['request'];
    final operation = result['operation'];
    if (request is! Map || operation is! Map) {
      throw const FlowEngineException('The saved request is missing its operation record.');
    }
    return (
      request: FlowRequestModel.fromJson(Map<String, dynamic>.from(request)),
      operation: FlowOperationModel.fromJson(Map<String, dynamic>.from(operation)),
    );
  }

  Future<List<FlowOperationModel>> listOperations() async {
    final result = await _invoke('flow-engine-operation', {'action': 'list'});
    return _list(result, 'operations', FlowOperationModel.fromJson);
  }

  Future<List<FlowVideoProjectModel>> listProjects() async {
    final result = await _invoke('flow-engine-operation', {'action': 'projects.list'});
    return _list(result, 'projects', FlowVideoProjectModel.fromJson);
  }

  Future<List<FlowApprovalModel>> listApprovals() async {
    final result = await _invoke('flow-engine-approval', {'action': 'list'});
    return _list(result, 'approvals', FlowApprovalModel.fromJson);
  }

  Future<List<FlowPublishingDraftModel>> listPublishingDrafts() async {
    final result = await _invoke('flow-engine-publishing', {'action': 'list'});
    return _list(result, 'drafts', FlowPublishingDraftModel.fromJson);
  }

  Future<List<FlowFinancialEntryModel>> listFinancialEntries() async {
    final result = await _invoke('flow-engine-finance', {'action': 'list'});
    return _list(result, 'entries', FlowFinancialEntryModel.fromJson);
  }

  Future<List<FlowSceneModel>> listScenes(String projectId) async {
    final result = await _invoke('flow-engine-operation', {
      'action': 'scenes.list',
      'projectId': projectId,
    });
    return _list(result, 'scenes', FlowSceneModel.fromJson);
  }

  Future<FlowApprovalModel> decideApproval({
    required String approvalId,
    required String decision,
  }) async {
    final result = await _invoke('flow-engine-approval', {
      'action': 'decide',
      'approvalId': approvalId,
      'decision': decision,
    });
    final approval = result['approval'];
    if (approval is! Map) {
      throw const FlowEngineException('The approval response is invalid.');
    }
    return FlowApprovalModel.fromJson(Map<String, dynamic>.from(approval));
  }
}
