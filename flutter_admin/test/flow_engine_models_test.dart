import 'package:flutter_test/flutter_test.dart';
import 'package:apex_studio_admin/features/flow_engine/flow_engine_models.dart';

void main() {
  test('parses request and operation records from the shared API contract', () {
    final request = FlowRequestModel.fromJson({
      'id': 'req-1',
      'ownerUserId': 'owner-1',
      'prompt': 'Create a campaign',
      'locale': 'en',
      'status': 'draft',
      'createdAt': '2026-10-31T10:00:00.000Z',
    });
    final operation = FlowOperationModel.fromJson({
      'id': 'op-1',
      'requestId': 'req-1',
      'ownerUserId': 'owner-1',
      'title': 'Create a campaign',
      'summary': 'Review before execution',
      'status': 'draft',
      'progress': 0,
      'createdAt': '2026-10-31T10:00:00.000Z',
      'updatedAt': '2026-10-31T10:00:00.000Z',
    });

    expect(request.id, 'req-1');
    expect(operation.requestId, request.id);
    expect(operation.progress, 0);
  });

  test('parses approvals and financial entries without inventing totals', () {
    final approval = FlowApprovalModel.fromJson({
      'id': 'approval-1',
      'operationId': 'op-1',
      'action': 'publish',
      'targetType': 'publishing_draft',
      'targetId': 'draft-1',
      'target': 'instagram:apex',
      'contentRevision': 2,
      'contentHash': 'a' * 64,
      'decision': 'pending',
    });
    final entry = FlowFinancialEntryModel.fromJson({
      'id': 'entry-1',
      'entryType': 'income',
      'amountMinor': 150000,
      'currency': 'EGP',
      'source': 'manual',
      'status': 'pending',
      'createdAt': '2026-10-31T10:00:00.000Z',
    });

    expect(approval.decision, 'pending');
    expect(entry.amountMinor, 150000);
    expect(entry.status, 'pending');
  });

  test('normalizes absent optional fields safely', () {
    final project = FlowVideoProjectModel.fromJson({
      'id': 'project-1',
      'title': 'Launch film',
      'status': 'planned',
      'createdAt': '2026-10-31T10:00:00.000Z',
      'updatedAt': '2026-10-31T10:00:00.000Z',
    });
    final scene = FlowSceneModel.fromJson({
      'id': 'scene-1',
      'projectId': 'project-1',
      'title': 'Opening',
      'status': 'planned',
      'revision': 1,
      'sortOrder': 0,
    });

    expect(project.brief, isEmpty);
    expect(scene.script, isEmpty);
    expect(scene.revision, 1);
  });
}
