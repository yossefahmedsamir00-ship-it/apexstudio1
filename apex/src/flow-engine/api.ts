export type FlowApiErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'not_configured'
  | 'provider_error'
  | 'conflict'
  | 'not_found'
  | 'internal_error';

export interface FlowSuccessEnvelope<T> {
  ok: true;
  data: T;
  correlationId?: string;
}

export interface FlowErrorEnvelope {
  ok: false;
  error: {
    code: FlowApiErrorCode;
    message: string;
    correlationId?: string;
  };
}

export type FlowApiEnvelope<T> = FlowSuccessEnvelope<T> | FlowErrorEnvelope;

const SAFE_ERROR_MESSAGES: Record<FlowApiErrorCode, string> = {
  validation_error: 'The request contains invalid fields.',
  unauthorized: 'Your session is not authorized to access this workspace.',
  not_configured: 'This capability is not configured yet.',
  provider_error: 'The requested provider action could not be completed.',
  conflict: 'The requested change conflicts with the current record state.',
  not_found: 'The requested record could not be found.',
  internal_error: 'The operation could not be completed. Try again later.',
};

export function createFlowSuccessEnvelope<T>(
  data: T,
  correlationId?: string,
): FlowSuccessEnvelope<T> {
  return correlationId ? { ok: true, data, correlationId } : { ok: true, data };
}

export function createFlowErrorEnvelope(
  code: FlowApiErrorCode,
  correlationId?: string,
): FlowErrorEnvelope {
  const error = {
    code,
    message: SAFE_ERROR_MESSAGES[code],
    ...(correlationId ? { correlationId } : {}),
  };
  return { ok: false, error };
}

export function isFlowApiEnvelope(value: unknown): value is FlowApiEnvelope<unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  if (candidate.ok === true) {
    return 'data' in candidate &&
      (candidate.correlationId === undefined || typeof candidate.correlationId === 'string');
  }

  if (candidate.ok !== false || !candidate.error || typeof candidate.error !== 'object') {
    return false;
  }

  const error = candidate.error as Record<string, unknown>;
  const knownCodes: readonly string[] = [
    'validation_error',
    'unauthorized',
    'not_configured',
    'provider_error',
    'conflict',
    'not_found',
    'internal_error',
  ];

  return knownCodes.includes(String(error.code)) &&
    typeof error.message === 'string' &&
    (error.correlationId === undefined || typeof error.correlationId === 'string');
}
