import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.75.0";
export type FlowErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_configured"
  | "provider_error"
  | "conflict"
  | "not_found"
  | "internal_error";

const SAFE_MESSAGES: Record<FlowErrorCode, string> = {
  validation_error: "The request contains invalid fields.",
  unauthorized: "Sign in to the private APEX owner console to continue.",
  forbidden: "This account is not authorized for the APEX owner workspace.",
  not_configured: "This capability is not configured yet.",
  provider_error: "The requested provider action could not be completed.",
  conflict: "The record changed. Refresh it and try again.",
  not_found: "The requested record could not be found.",
  internal_error: "The operation could not be completed. Try again later.",
};

export class FlowRequestError extends Error {
  constructor(
    readonly code: FlowErrorCode,
    readonly status: number,
  ) {
    super(SAFE_MESSAGES[code]);
    this.name = "FlowRequestError";
  }
}

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  const origin = request.headers.get("origin") ?? "";
  const extras = (Deno.env.get("APEX_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const allowed = new Set([
    "https://yossefahmedsamir00-ship-it.github.io",
    ...extras,
  ]);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // Native Flutter clients do not send browser origins.
  const extras = (Deno.env.get("APEX_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const allowed = new Set([
    "https://yossefahmedsamir00-ship-it.github.io",
    ...extras,
  ]);
  if (!allowed.has(origin)) throw new FlowRequestError("forbidden", 403);
}

export async function readJsonBody(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<Record<string, unknown>> {
  const contentType = (request.headers.get("content-type") ?? "")
    .split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new FlowRequestError("validation_error", 415);
  }
  const length = request.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
    throw new FlowRequestError("validation_error", 413);
  }
  const source = await request.text();
  if (new TextEncoder().encode(source).byteLength > maxBytes) {
    throw new FlowRequestError("validation_error", 413);
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new FlowRequestError("validation_error", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FlowRequestError("validation_error", 400);
  }
  return value as Record<string, unknown>;
}

export function requireString(
  value: unknown,
  field: string,
  maxLength: number,
  minLength = 1,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length < minLength ||
    value.trim().length > maxLength
  ) {
    throw new FlowRequestError("validation_error", 400);
  }
  return value.trim();
}

export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  values: readonly T[],
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new FlowRequestError("validation_error", 400);
  }
  return value as T;
}

export function requireInteger(
  value: unknown,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new FlowRequestError("validation_error", 400);
  }
  return value;
}

export function correlationId(): string {
  return crypto.randomUUID();
}

export function toFlowError(error: unknown): {
  code: FlowErrorCode;
  status: number;
  message: string;
} {
  if (error instanceof FlowRequestError) {
    return { code: error.code, status: error.status, message: error.message };
  }
  return {
    code: "internal_error",
    status: 500,
    message: SAFE_MESSAGES.internal_error,
  };
}

