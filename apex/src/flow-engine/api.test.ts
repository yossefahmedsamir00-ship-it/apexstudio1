import { describe, expect, it } from 'vitest';
import {
  createFlowErrorEnvelope,
  createFlowSuccessEnvelope,
  isFlowApiEnvelope,
} from './api';

describe('Flow Engine API envelopes', () => {
  it('creates a typed success envelope without changing returned data', () => {
    const envelope = createFlowSuccessEnvelope(
      { requestId: 'request-1', operationStatus: 'draft' },
      'corr-1',
    );

    expect(envelope).toEqual({
      ok: true,
      data: { requestId: 'request-1', operationStatus: 'draft' },
      correlationId: 'corr-1',
    });
    expect(isFlowApiEnvelope(envelope)).toBe(true);
  });

  it.each([
    'validation_error',
    'unauthorized',
    'not_configured',
    'provider_error',
  ] as const)('distinguishes the %s error code', (code) => {
    const envelope = createFlowErrorEnvelope(code, 'corr-2');

    expect(envelope.ok).toBe(false);
    if (!envelope.ok) {
      expect(envelope.error.code).toBe(code);
      expect(envelope.error.message.length).toBeGreaterThan(0);
      expect(envelope.error.correlationId).toBe('corr-2');
    }
    expect(isFlowApiEnvelope(envelope)).toBe(true);
  });

  it('never includes provider payloads, bearer tokens, or secret-bearing fields', () => {
    const envelope = createFlowErrorEnvelope('provider_error', 'corr-3');
    const serialized = JSON.stringify(envelope);

    expect(serialized).not.toMatch(/Bearer|service_role|secret|access_token|provider_payload/i);
  });
});
