import type {
  FlowApproval,
  FlowFinancialEntry,
  FlowPublishingDraft,
  FlowOperation,
  FlowRequest,
  FlowScene,
  FlowVideoProject,
} from './domain';
import { isFlowApiEnvelope, type FlowApiErrorCode } from './api';

export interface FlowInvokeOptions {
  body: Record<string, unknown>;
}

export interface FlowFunctionInvoker {
  invoke(
    functionName: string,
    options: FlowInvokeOptions,
  ): Promise<{ data: unknown; error: unknown | null }>;
}

export class FlowApiClientError extends Error {
  readonly code: FlowApiErrorCode;
  readonly correlationId?: string;

  constructor(code: FlowApiErrorCode, message: string, correlationId?: string) {
    super(message);
    this.name = 'FlowApiClientError';
    this.code = code;
    this.correlationId = correlationId;
  }
}

export interface CreateFlowRequestInput {
  prompt: string;
  locale: 'ar' | 'en';
  idempotencyKey: string;
}

export interface CreatedFlowRequest {
  request: FlowRequest;
  operation: FlowOperation;
}

export interface CreateFlowProjectInput {
  operationId: string;
  title: string;
  brief?: string;
}

export interface CreateFlowSceneInput {
  projectId: string;
  title: string;
  brief?: string;
  script?: string;
  visualDirection?: string;
  sortOrder?: number;
}

export interface UpdateFlowSceneInput {
  sceneId: string;
  title?: string;
  brief?: string;
  script?: string;
  visualDirection?: string;
  status?: FlowScene['status'];
}

export interface CreateFlowFinancialEntryInput {
  operationId?: string;
  entryType: FlowFinancialEntry['entryType'];
  amountMinor: number;
  currency: string;
  source: FlowFinancialEntry['source'];
  status: FlowFinancialEntry['status'];
  evidenceReference?: string;
  occurredAt?: string;
}

export class FlowEngineClient {
  constructor(private readonly functions: FlowFunctionInvoker) {}

  private async invoke<T>(
    functionName: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    let response: { data: unknown; error: unknown | null };

    try {
      response = await this.functions.invoke(functionName, { body });
    } catch {
      throw new FlowApiClientError('provider_error', 'The Flow Engine service could not be reached.');
    }

    if (response.error) {
      throw new FlowApiClientError('provider_error', 'The Flow Engine service could not be reached.');
    }

    if (!isFlowApiEnvelope<T>(response.data)) {
      throw new FlowApiClientError('internal_error', 'The Flow Engine returned an invalid response.');
    }

    if (!response.data.ok) {
      throw new FlowApiClientError(
        response.data.error.code,
        response.data.error.message,
        response.data.error.correlationId,
      );
    }

    return response.data.data;
  }

  createRequest(input: CreateFlowRequestInput): Promise<CreatedFlowRequest> {
    return this.invoke('flow-engine-request', {
      action: 'create',
      prompt: input.prompt,
      locale: input.locale,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async listRequests(): Promise<FlowRequest[]> {
    const result = await this.invoke<{ requests: FlowRequest[] }>(
      'flow-engine-request',
      { action: 'list' },
    );
    return result.requests;
  }

  getRequest(requestId: string): Promise<{ request: FlowRequest; operation: FlowOperation | null }> {
    return this.invoke('flow-engine-request', { action: 'get', requestId });
  }

  async listOperations(): Promise<FlowOperation[]> {
    const result = await this.invoke<{ operations: FlowOperation[] }>(
      'flow-engine-operation',
      { action: 'list' },
    );
    return result.operations;
  }

  async listProjects(): Promise<FlowVideoProject[]> {
    const result = await this.invoke<{ projects: FlowVideoProject[] }>(
      'flow-engine-operation',
      { action: 'projects.list' },
    );
    return result.projects;
  }

  async listScenes(projectId: string): Promise<FlowScene[]> {
    const result = await this.invoke<{ scenes: FlowScene[] }>(
      'flow-engine-operation',
      { action: 'scenes.list', projectId },
    );
    return result.scenes;
  }

  async listPublishingDrafts(): Promise<FlowPublishingDraft[]> {
    const result = await this.invoke<{ drafts: FlowPublishingDraft[] }>(
      'flow-engine-publishing',
      { action: 'list' },
    );
    return result.drafts;
  }

  async createPublishingDraft(input: {
    operationId: string;
    platform: FlowPublishingDraft['platform'];
    title?: string;
    body: string;
  }): Promise<FlowPublishingDraft> {
    const result = await this.invoke<{ draft: FlowPublishingDraft }>(
      'flow-engine-publishing',
      { action: 'create', ...input },
    );
    return result.draft;
  }

  async updatePublishingDraft(input: {
    draftId: string;
    title?: string;
    body?: string;
  }): Promise<FlowPublishingDraft> {
    const result = await this.invoke<{ draft: FlowPublishingDraft }>(
      'flow-engine-publishing',
      { action: 'update', ...input },
    );
    return result.draft;
  }

  requestPublish(draftId: string): Promise<never> {
    return this.invoke<never>('flow-engine-publishing', { action: 'publish', draftId });
  }

  getOperation(operationId: string): Promise<{
    operation: FlowOperation;
    steps: Array<Record<string, unknown>>;
  }> {
    return this.invoke('flow-engine-operation', { action: 'get', operationId });
  }

  async createProject(input: CreateFlowProjectInput): Promise<FlowVideoProject> {
    const result = await this.invoke<{ project: FlowVideoProject }>('flow-engine-operation', {
      action: 'project.create',
      ...input,
    });
    return result.project;
  }

  async createScene(input: CreateFlowSceneInput): Promise<FlowScene> {
    const result = await this.invoke<{ scene: FlowScene }>('flow-engine-operation', {
      action: 'scene.create',
      ...input,
    });
    return result.scene;
  }

  async updateScene(input: UpdateFlowSceneInput): Promise<FlowScene> {
    const result = await this.invoke<{ scene: FlowScene }>('flow-engine-operation', {
      action: 'scene.update',
      ...input,
    });
    return result.scene;
  }

  async listApprovals(): Promise<FlowApproval[]> {
    const result = await this.invoke<{ approvals: FlowApproval[] }>(
      'flow-engine-approval',
      { action: 'list' },
    );
    return result.approvals;
  }

  async requestApproval(input: {
    operationId: string;
    targetType: 'scene' | 'publishing_draft';
    targetId: string;
    action: 'publish' | 'approve_scene';
  }): Promise<FlowApproval> {
    const result = await this.invoke<{ approval: FlowApproval }>('flow-engine-approval', {
      action: 'request',
      operationAction: input.action,
      operationId: input.operationId,
      targetType: input.targetType,
      targetId: input.targetId,
    });
    return result.approval;
  }

  async decideApproval(input: {
    approvalId: string;
    decision: 'approved' | 'rejected';
    comment?: string;
  }): Promise<FlowApproval> {
    const result = await this.invoke<{ approval: FlowApproval }>('flow-engine-approval', {
      action: 'decide',
      ...input,
    });
    return result.approval;
  }

  async listFinancialEntries(): Promise<FlowFinancialEntry[]> {
    const result = await this.invoke<{ entries: FlowFinancialEntry[] }>(
      'flow-engine-finance',
      { action: 'list' },
    );
    return result.entries;
  }

  async createFinancialEntry(input: CreateFlowFinancialEntryInput): Promise<FlowFinancialEntry> {
    const result = await this.invoke<{ entry: FlowFinancialEntry }>('flow-engine-finance', {
      action: 'create',
      ...input,
    });
    return result.entry;
  }
}
