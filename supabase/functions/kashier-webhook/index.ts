import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* fail closed */ } }
  return undefined;
}
function kashierConfig() {
  const mode = (Deno.env.get("KASHIER_MODE") ?? "test").trim().toLowerCase();
  if (mode !== "test" && mode !== "live") return null;
  const prefix = mode === "test" ? "KASHIER_TEST_" : "KASHIER_LIVE_";
  const paymentApiKey = Deno.env.get(prefix + "PAYMENT_API_KEY")?.trim();
  const merchantId = Deno.env.get(prefix + "MERCHANT_ID")?.trim();
  if (!paymentApiKey || !merchantId) return null;
  return { mode, paymentApiKey, merchantId };
}
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signed), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
function equalHex(a: string, b: string) {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function toMinor(amount: unknown): number | null {
  const n = typeof amount === "number" ? amount : Number(String(amount ?? ""));
  if (!Number.isFinite(n) || n < 0) return null;
  const minor = Math.round(n * 100);
  return Number.isSafeInteger(minor) && Math.abs(n * 100 - minor) <= 0.01 ? minor : null;
}
class BodyTooLargeError extends Error {}
async function readBodyTextLimited(req: Request, maxBytes: number): Promise<string> {
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new Error("invalid content length");
    const n = Number(declared);
    if (!Number.isSafeInteger(n) || n > maxBytes) throw new BodyTooLargeError();
  }
  if (!req.body) throw new Error("empty body");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if (part.value.byteLength > maxBytes - total) {
        try { await reader.cancel(); } catch { /* best effort */ }
        throw new BodyTooLargeError();
      }
      total += part.value.byteLength;
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
const respond = (status: number) => new Response(null, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return respond(405);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return respond(415);

  const cfg = kashierConfig();
  const url = Deno.env.get("SUPABASE_URL");
  const key = serviceKey();
  if (!cfg || !url || !key) return respond(503);

  let rawBody: string;
  let payload: Record<string, unknown>;
  try {
    rawBody = await readBodyTextLimited(req, 64 * 1024);
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid JSON object");
    payload = parsed as Record<string, unknown>;
  } catch (error) {
    return respond(error instanceof BodyTooLargeError ? 413 : 400);
  }

  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return respond(400);
  const signedData = data as Record<string, unknown>;
  const signatureKeys = signedData.signatureKeys;
  const signature = req.headers.get("x-kashier-signature") ?? "";
  if (!Array.isArray(signatureKeys) || signatureKeys.length < 1 || signatureKeys.length > 60 ||
      signatureKeys.some((k) => typeof k !== "string" || !Object.prototype.hasOwnProperty.call(signedData, k))) {
    return respond(401);
  }
  const uniqueKeys = new Set(signatureKeys as string[]);
  if (uniqueKeys.size !== signatureKeys.length) return respond(401);
  for (const k of signatureKeys as string[]) {
    const value = signedData[k];
    if (value === null || value === undefined ||
        !["string", "number", "boolean"].includes(typeof value)) return respond(401);
  }
  // Kashier's payment webhook signature sorts signatureKeys alphabetically and URL-encodes values only.
  const sortedKeys = [...signatureKeys as string[]].sort();
  const signaturePayload = sortedKeys.map((k) => k + "=" + encodeURIComponent(String(signedData[k]))).join("&");
  const expected = await hmacHex(cfg.paymentApiKey, signaturePayload);
  if (!equalHex(expected, signature)) {
    console.warn("Rejected Kashier webhook with invalid signature");
    return respond(401);
  }

  const merchantId = typeof signedData.merchantId === "string" ? signedData.merchantId.trim() : null;
  // If supplied, merchantId must match the environment. Order, amount, currency, status and transaction id
  // are taken only from the signed data fields.
  if (merchantId && merchantId !== cfg.merchantId) {
    console.warn("Rejected Kashier webhook for a different merchant");
    return respond(401);
  }

  const event = typeof payload.event === "string" ? payload.event.trim().slice(0, 60) : "unknown";
  const status = String(signedData.status ?? "").toUpperCase();
  const merchantReference = typeof signedData.orderReference === "string" ? signedData.orderReference.trim()
    : typeof signedData.merchantOrderId === "string" ? signedData.merchantOrderId.trim() : "";
  const amountMinor = toMinor(signedData.amount);
  const currency = String(signedData.currency ?? "").toUpperCase();
  const transactionId = typeof signedData.transactionId === "string" ? signedData.transactionId.trim().slice(0, 160) : null;
  if (!merchantReference || merchantReference.length > 160 || amountMinor === null || !currency || currency.length > 8) {
    return respond(400);
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const fingerprint = await sha256Hex([signature.toLowerCase(), signaturePayload, event].join("\n"));
  const { data: result, error } = await admin.rpc("process_kashier_webhook", {
    p_fingerprint: fingerprint,
    p_event_type: event,
    p_provider_status: status,
    p_provider_reference: merchantReference,
    p_transaction_id: transactionId,
    p_amount_minor: amountMinor,
    p_currency: currency,
    p_merchant_id: merchantId,
    p_expected_merchant_id: cfg.merchantId,
    p_method: typeof signedData.method === "string" ? signedData.method : null,
    p_response_code: typeof signedData.transactionResponseCode === "string" ? signedData.transactionResponseCode : null,
    p_request_id: crypto.randomUUID(),
  });
  if (error || !result || typeof result !== "object") {
    console.error("Kashier webhook reconciliation failed", error?.code ?? "invalid_rpc_response");
    return respond(500);
  }
  const outcome = (result as Record<string, unknown>).result;
  if (outcome === "rejected" || outcome === "unmatched" || outcome === "transaction_reused") {
    console.warn("Kashier webhook flagged for review", {
      outcome, event, status, reference: merchantReference.slice(0, 16),
    });
  }
  // The transaction is durably recorded and deduplicated. Acknowledge it so Kashier does not flood retries.
  return respond(200);
});
