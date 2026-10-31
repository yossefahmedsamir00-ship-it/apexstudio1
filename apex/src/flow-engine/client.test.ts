import { describe, expect, it, vi } from 'vitest';
import { FlowApiClientError, FlowEngineClient } from './client';

describe('FlowEngineClient', () => {
  it('sends the original owner prompt and returns the persisted request proposal', async () => {
    const request = {
      id: 'request-1',
      ownerUserId: 'owner-1',
      prompt: 'Create a video campaign',
      locale: 'en' as const,
      status: 'draft' as const,
      createdAt: '2026-10-31T10:00:00.000Z',
    };
    const operation = {
      id: 'operation-1',
      requestId: request.id,
      ownerUserId: request.ownerUserId,
      title: 'Create a video campaign',
      summary: 'Review the proposed steps before execution.',
      status: 'draft' as const,
      progress: 0,
      createdAt: request.createdAt,
      updatedAt: request.createdAt,
    };
    const invoke = vi.fn().mockResolvedValue({
      data: { ok: true, data: { request, operation }, correlationId: 'corr-1' },
      error: null,
    });
    const client = new FlowEngineClient({ invoke });

    const result = await client.createRequest({
      prompt: request.prompt,
      locale: request.locale,
      idempotencyKey: 'once-1',
    });

    expect(invoke).toHaveBeenCalledWith('flow-engine-request', {
      body: { action: 'create', prompt: request.prompt, locale: 'en', idempotencyKey: 'once-1' },
    });
    expect(result).toEqual({ request, operation });
  });

  it('converts an unauthorized API envelope into a safe typed error', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        ok: false,
        error: {
          code: 'unauthorized',
          message: 'Your session is not authorized to access this workspace.',
        },
      },
      error: null,
    });
    const client = new FlowEngineClient({ invoke });

    await expect(client.listOperations()).rejects.toMatchObject({
      name: 'FlowApiClientError',
      code: 'unauthorized',
    });
  });

  it('does not expose raw transport errors to the UI', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Bearer service_role secret token'),
    });
    const client = new FlowEngineClient({ invoke });

    let caught: unknown;
    try {
      await client.listOperations();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(FlowApiClientError);
    expect(String(caught)).not.toMatch(/Bearer|service_role|secret|token/i);
  });
});
