import { describe, expect, it } from 'vitest';
import {
  approvalMatchesAction,
  validateFlowFinancialEntry,
  validateFlowOperation,
  validateFlowOperationStep,
  validateFlowRequest,
} from './domain';

describe('Flow Engine domain contracts', () => {
  it('accepts a valid owner request and a canonical draft operation', () => {
    const request = validateFlowRequest({
      id: 'request-1',
      ownerUserId: 'owner-1',
      prompt: 'Create an APEX campaign storyboard',
      locale: 'en',
      status: 'draft',
      createdAt: '2026-10-31T10:00:00.000Z',
    });

    const operation = validateFlowOperation({
      id: 'operation-1',
      requestId: request.id,
      ownerUserId: request.ownerUserId,
      title: 'APEX campaign',
      summary: 'Prepare a storyboard for review',
      status: 'draft',
      progress: 0,
      createdAt: request.createdAt,
      updatedAt: request.createdAt,
    });

    expect(request.prompt).toBe('Create an APEX campaign storyboard');
    expect(operation.status).toBe('draft');
    expect(operation.progress).toBe(0);
  });

  it('rejects unsupported operation lifecycle states', () => {
    expect(() =>
      validateFlowOperation({
        id: 'operation-1',
        requestId: 'request-1',
        ownerUserId: 'owner-1',
        title: 'Invalid operation',
        summary: '',
        status: 'published',
        progress: 0,
        createdAt: '2026-10-31T10:00:00.000Z',
        updatedAt: '2026-10-31T10:00:00.000Z',
      }),
    ).toThrow(/status/i);
  });

  it('rejects an operation step that references a missing operation', () => {
    expect(() =>
      validateFlowOperationStep(
        {
          id: 'step-1',
          operationId: 'missing-operation',
          ownerUserId: 'owner-1',
          title: 'Prepare draft',
          status: 'pending',
          stepOrder: 0,
          dependsOn: [],
        },
        ['operation-1'],
      ),
    ).toThrow(/operation/i);
  });

  it('invalidates approvals when the approved revision or target changes', () => {
    const approval = {
      id: 'approval-1',
      ownerUserId: 'owner-1',
      action: 'publish' as const,
      contentRevision: 3,
      target: 'instagram:apex-studio',
      contentHash: 'a'.repeat(64),
      decision: 'approved' as const,
      decidedAt: '2026-10-31T10:00:00.000Z',
    };

    expect(
      approvalMatchesAction(approval, {
        action: 'publish',
        contentRevision: 3,
        target: 'instagram:apex-studio',
        contentHash: 'a'.repeat(64),
      }),
    ).toBe(true);

    expect(
      approvalMatchesAction(approval, {
        action: 'publish',
        contentRevision: 4,
        target: 'instagram:apex-studio',
        contentHash: 'b'.repeat(64),
      }),
    ).toBe(false);

    expect(
      approvalMatchesAction(approval, {
        action: 'publish',
        contentRevision: 3,
        target: 'youtube:apex-studio',
        contentHash: 'a'.repeat(64),
      }),
    ).toBe(false);
  });

  it('rejects financial entries with an unsupported lifecycle state', () => {
    expect(() =>
      validateFlowFinancialEntry({
        id: 'finance-1',
        ownerUserId: 'owner-1',
        entryType: 'income',
        amountMinor: 250000,
        currency: 'EGP',
        source: 'manual',
        status: 'paid',
        createdAt: '2026-10-31T10:00:00.000Z',
      }),
    ).toThrow(/status/i);
  });
});
