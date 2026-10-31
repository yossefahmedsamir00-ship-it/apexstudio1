export type FlowLocale = 'ar' | 'en';

export type FlowOperationStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'waiting_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type FlowSceneStatus =
  | 'planned'
  | 'drafting'
  | 'ready_for_review'
  | 'approved'
  | 'generating'
  | 'completed'
  | 'failed';

export type FlowPublishingStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'not_configured';

export type FlowFinancialStatus =
  | 'pending'
  | 'confirmed'
  | 'refunded'
  | 'estimated'
  | 'voided';

export type FlowFinancialEntryType = 'income' | 'expense' | 'refund';
export type FlowFinancialSource = 'manual' | 'kashier' | 'provider_import' | 'other';
export type FlowApprovalAction = 'publish' | 'send' | 'execute' | 'approve_scene';

export interface FlowRequest {
  id: string;
  ownerUserId: string;
  prompt: string;
  locale: FlowLocale;
  status: 'draft' | 'accepted' | 'cancelled';
  createdAt: string;
}

export interface FlowOperation {
  id: string;
  requestId: string;
  ownerUserId: string;
  title: string;
  summary: string;
  status: FlowOperationStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowOperationStep {
  id: string;
  operationId: string;
  ownerUserId: string;
  title: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  stepOrder: number;
  dependsOn: string[];
}

export interface FlowVideoProject {
  id: string;
  ownerUserId: string;
  operationId?: string;
  title: string;
  brief: string;
  status: 'planned' | 'drafting' | 'in_review' | 'approved' | 'completed' | 'failed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface FlowScene {
  id: string;
  projectId: string;
  ownerUserId: string;
  title: string;
  brief: string;
  script: string;
  visualDirection: string;
  status: FlowSceneStatus;
  revision: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowAsset {
  id: string;
  sceneId: string;
  ownerUserId: string;
  storageBucket: string;
  storagePath: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'other';
  mimeType?: string;
  byteSize?: number;
  createdAt: string;
}

export interface FlowApproval {
  id: string;
  ownerUserId: string;
  action: FlowApprovalAction;
  contentRevision: number;
  target: string;
  contentHash: string;
  decision: 'pending' | 'approved' | 'rejected' | 'revoked';
  decidedAt?: string;
}

export interface FlowApprovalActionSnapshot {
  action: FlowApprovalAction;
  contentRevision: number;
  target: string;
  contentHash: string;
}

export interface FlowPublishingDraft {
  id: string;
  ownerUserId: string;
  operationId: string;
  platform: 'instagram' | 'facebook' | 'x' | 'tiktok' | 'youtube' | 'other';
  title: string;
  body: string;
  contentHash: string;
  revision: number;
  status: FlowPublishingStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlowFinancialEntry {
  id: string;
  ownerUserId: string;
  entryType: FlowFinancialEntryType;
  amountMinor: number;
  currency: string;
  source: FlowFinancialSource;
  status: FlowFinancialStatus;
  evidenceReference?: string;
  createdAt: string;
}

export interface FlowAuditEvent {
  id: string;
  ownerUserId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class FlowDomainError extends Error {
  readonly code = 'validation_error';

  constructor(message: string) {
    super(message);
    this.name = 'FlowDomainError';
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new FlowDomainError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new FlowDomainError(`${field} is invalid`);
  }
  return value.trim();
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new FlowDomainError(`${field} has an unsupported value`);
  }
  return value as T;
}

function positiveInteger(value: unknown, field: string, allowZero = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    (allowZero ? value < 0 : value < 1)
  ) {
    throw new FlowDomainError(`${field} must be a valid integer`);
  }
  return value;
}

export function validateFlowRequest(input: unknown): FlowRequest {
  const value = record(input, 'Request');
  const locale = oneOf(value.locale, ['ar', 'en'] as const, 'locale');
  return {
    id: text(value.id, 'id', 80),
    ownerUserId: text(value.ownerUserId, 'ownerUserId', 80),
    prompt: text(value.prompt, 'prompt', 8000),
    locale,
    status: oneOf(value.status, ['draft', 'accepted', 'cancelled'] as const, 'status'),
    createdAt: text(value.createdAt, 'createdAt', 64),
  };
}

export function validateFlowOperation(input: unknown): FlowOperation {
  const value = record(input, 'Operation');
  const progress = value.progress;
  if (typeof progress !== 'number' || !Number.isInteger(progress) || progress < 0 || progress > 100) {
    throw new FlowDomainError('progress must be an integer from 0 to 100');
  }
  return {
    id: text(value.id, 'id', 80),
    requestId: text(value.requestId, 'requestId', 80),
    ownerUserId: text(value.ownerUserId, 'ownerUserId', 80),
    title: text(value.title, 'title', 160),
    summary: typeof value.summary === 'string' ? value.summary.slice(0, 4000) : '',
    status: oneOf(
      value.status,
      ['draft', 'queued', 'running', 'waiting_approval', 'succeeded', 'failed', 'cancelled'] as const,
      'status',
    ),
    progress,
    createdAt: text(value.createdAt, 'createdAt', 64),
    updatedAt: text(value.updatedAt, 'updatedAt', 64),
  };
}

export function validateFlowOperationStep(
  input: unknown,
  knownOperationIds: readonly string[],
): FlowOperationStep {
  const value = record(input, 'Operation step');
  const operationId = text(value.operationId, 'operationId', 80);
  if (!knownOperationIds.includes(operationId)) {
    throw new FlowDomainError('operationId does not reference a known operation');
  }
  const dependencies = value.dependsOn ?? [];
  if (!Array.isArray(dependencies) || dependencies.some((item) => typeof item !== 'string')) {
    throw new FlowDomainError('dependsOn must be a list of step IDs');
  }
  return {
    id: text(value.id, 'id', 80),
    operationId,
    ownerUserId: text(value.ownerUserId, 'ownerUserId', 80),
    title: text(value.title, 'title', 160),
    status: oneOf(value.status, ['pending', 'running', 'succeeded', 'failed', 'skipped'] as const, 'status'),
    stepOrder: positiveInteger(value.stepOrder, 'stepOrder', true),
    dependsOn: [...dependencies],
  };
}

export function approvalMatchesAction(
  approval: FlowApproval,
  action: FlowApprovalActionSnapshot,
): boolean {
  return (
    approval.decision === 'approved' &&
    approval.action === action.action &&
    approval.contentRevision === action.contentRevision &&
    approval.target === action.target &&
    approval.contentHash === action.contentHash
  );
}

export function validateFlowFinancialEntry(input: unknown): FlowFinancialEntry {
  const value = record(input, 'Financial entry');
  const amountMinor = positiveInteger(value.amountMinor, 'amountMinor');
  const currency = text(value.currency, 'currency', 3);
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new FlowDomainError('currency must be a 3-letter uppercase code');
  }
  const evidenceReference =
    typeof value.evidenceReference === 'string' && value.evidenceReference.trim()
      ? value.evidenceReference.trim().slice(0, 500)
      : undefined;

  return {
    id: text(value.id, 'id', 80),
    ownerUserId: text(value.ownerUserId, 'ownerUserId', 80),
    entryType: oneOf(value.entryType, ['income', 'expense', 'refund'] as const, 'entryType'),
    amountMinor,
    currency,
    source: oneOf(value.source, ['manual', 'kashier', 'provider_import', 'other'] as const, 'source'),
    status: oneOf(value.status, ['pending', 'confirmed', 'refunded', 'estimated', 'voided'] as const, 'status'),
    evidenceReference,
    createdAt: text(value.createdAt, 'createdAt', 64),
  };
}
