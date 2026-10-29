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
  const secretKey = Deno.env.get(prefix + "SECRET_KEY")?.trim();
  const paymentApiKey = Deno.env.get(prefix + "PAYMENT_API_KEY")?.trim();
  const merchantId = Deno.env.get(prefix + "MERCHANT_ID")?.trim();
  if (!secretKey || !paymentApiKey || !merchantId) return null;
  return { mode, secretKey, paymentApiKey, merchantId, baseUrl: mode === "test" ? "https://test-api.kashier.io" : "https://api.kashier.io" };
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
async function readBoundedText(stream: ReadableStream<Uint8Array> | null, maxBytes: number, declaredLength?: string | null): Promise<string> {
  if (declaredLength !== null && declaredLength !== undefined) {
    if (!/^\d+$/.test(declaredLength)) throw new Error("invalid content length");
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length)) throw new Error("invalid content length");
    if (length > maxBytes) throw new BodyTooLargeError();
  }
  if (!stream) throw new Error("empty body");
  const reader = stream.getReader();
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
  const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return respond(415);

  const cfg = kashierConfig();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = serviceKey();
  if (!cfg || !supabaseUrl || !key) return respond(503);

  let payload: Record<string, unknown>;
  try {
    const raw = await readBoundedText(req.body, 64 * 1024, req.headers.get("content-length"));
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid JSON object");
    payload = parsed as Record<string, unknown>;
  } catch (error) {
    return respond(error instanceof BodyTooLargeError ? 413 : 400);
  }

  if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) return respond(400);
  const data = payload.data as Record<string, unknown>;
  const keys = data.signatureKeys;
  const signature = req.headers.get("x-kashier-signature") ?? "";
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > 60 ||
      keys.some((k) => typeof k !== "string" || !Object.prototype.hasOwnProperty.call(data, k)) ||
      new Set(keys as string[]).size !== keys.length) return respond(401);
  for (const k of keys as string[]) {
    const value = data[k];
    if (value === null || value === undefined || !["string", "number", "boolean"].includes(typeof value)) return respond(401);
  }

  // Verify Kashier payment webhook signature: sort keys and encode values only.
  const signedKeys = [...keys as string[]].sort();
  const signaturePayload = signedKeys.map((k) => k + "=" + encodeURIComponent(String(data[k]))).join("&");
  const expected = await hmacHex(cfg.paymentApiKey, signaturePayload);
  if (!equalHex(expected, signature)) {
    console.warn("Rejected Kashier webhook with invalid signature");
    return respond(401);
  }

  const signedMerchantId = typeof data.merchantId === "string" ? data.merchantId.trim() : "";
  if (signedMerchantId && signedMerchantId !== cfg.merchantId) return respond(401);
  const currency = String(data.currency ?? "").toUpperCase();
  const amountMinor = toMinor(data.amount);
  const signedStatus = String(data.status ?? "").toUpperCase();
  const transactionId = typeof data.transactionId === "string" ? data.transactionId.trim().slice(0, 160) : null;
  const candidateRefs = [
    typeof data.orderReference === "string" ? data.orderReference.trim() : "",
    typeof data.merchantOrderId === "string" ? data.merchantOrderId.trim() : "",
  ].filter((value, index, all) => value.length > 0 && value.length <= 160 && all.indexOf(value) === index);
  if (!candidateRefs.length || amountMinor === null || currency.length === 0 || currency.length > 8) return respond(400);

  const admin = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let order: Record<string, unknown> | null = null;
  for (const ref of candidateRefs) {
    const { data: found, error } = await admin.from("payment_orders")
      .select("id,provider,provider_reference,provider_session_id,amount_minor,currency,status,provider_transaction_id")
      .eq("provider", "kashier").eq("provider_reference", ref).maybeSingle();
    if (error) {
      console.error("Kashier order lookup failed", error.code);
      return respond(500);
    }
    if (found) { order = found as Record<string, unknown>; break; }
  }

  const requestId = crypto.randomUUID();
  if (!order) {
    const { error } = await admin.rpc("process_kashier_webhook", {
      p_fingerprint: await sha256Hex([signature.toLowerCase(), signaturePayload, "unmatched"].join("\n")),
      p_event_type: "unverified",
      p_provider_status: signedStatus,
      p_provider_reference: candidateRefs[0],
      p_transaction_id: transactionId,
      p_amount_minor: amountMinor,
      p_currency: currency,
      p_merchant_id: signedMerchantId || null,
      p_expected_merchant_id: cfg.merchantId,
      p_method: typeof data.method === "string" ? data.method : null,
      p_response_code: typeof data.transactionResponseCode === "string" ? data.transactionResponseCode : null,
      p_request_id: requestId,
    });
    if (error) { console.error("Kashier unmatched event ledger failed", error.code); return respond(500); }
    return respond(200);
  }

  if (amountMinor !== Number(order.amount_minor) || currency !== "EGP" || order.currency !== "EGP") {
    const { error } = await admin.rpc("process_kashier_webhook", {
      p_fingerprint: await sha256Hex([signature.toLowerCase(), signaturePayload, "callback-mismatch"].join("\n")),
      p_event_type: "unverified",
      p_provider_status: signedStatus,
      p_provider_reference: String(order.provider_reference),
      p_transaction_id: transactionId,
      p_amount_minor: amountMinor,
      p_currency: currency,
      p_merchant_id: signedMerchantId || null,
      p_expected_merchant_id: cfg.merchantId,
      p_method: typeof data.method === "string" ? data.method : null,
      p_response_code: typeof data.transactionResponseCode === "string" ? data.transactionResponseCode : null,
      p_request_id: requestId,
    });
    if (error) { console.error("Kashier mismatch ledger failed", error.code); return respond(500); }
    return respond(200);
  }

  const sessionId = typeof order.provider_session_id === "string" ? order.provider_session_id : "";
  if (!sessionId || !/^[a-zA-Z0-9_-]{8,100}$/.test(sessionId)) {
    console.error("Kashier order has no valid provider session", { orderId: order.id });
    return respond(200);
  }

  // The top-level event name is not signed. Verify the stored provider session's current state before changing money state.
  let providerSession: Record<string, unknown>;
  try {
    const upstream = await fetch(cfg.baseUrl + "/v3/payment/sessions/" + encodeURIComponent(sessionId), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      console.error("Kashier session verification failed", { status: upstream.status });
      return respond(503);
    }
    const responseText = await readBoundedText(upstream.body, 256 * 1024, upstream.headers.get("content-length"));
    const parsed: unknown = JSON.parse(responseText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid provider session response");
    providerSession = parsed as Record<string, unknown>;
  } catch (error) {
    console.error("Kashier session verification unavailable", error instanceof BodyTooLargeError ? "response_too_large" : error instanceof Error ? error.name : "unknown");
    return respond(503);
  }

  const sessionIdReturned = String(providerSession._id ?? "");
  const sessionMerchant = String(providerSession.merchantId ?? "");
  const paymentParams = providerSession.paymentParams && typeof providerSession.paymentParams === "object" && !Array.isArray(providerSession.paymentParams)
    ? providerSession.paymentParams as Record<string, unknown> : {};
  const sessionAmount = toMinor(paymentParams.amount);
  const sessionCurrency = String(paymentParams.currency ?? "").toUpperCase();
  const capturedMinor = toMinor(providerSession.capturedAmount);
  const refundedMinor = toMinor(providerSession.refundedAmount);
  const providerStatus = String(providerSession.status ?? "").toUpperCase();
  const referenceReturned = String(paymentParams.order ?? "");
  const providerDetailsMatch = sessionIdReturned === sessionId &&
    sessionMerchant === cfg.merchantId &&
    sessionAmount === Number(order.amount_minor) &&
    sessionCurrency === "EGP" &&
    referenceReturned === String(order.provider_reference);

  if (!providerDetailsMatch || capturedMinor === null || refundedMinor === null) {
    const { error } = await admin.from("security_events").insert({
      actor_user_id: null, event_type: "kashier_session_reconciliation_mismatch", severity: "critical",
      endpoint: "/functions/v1/kashier-webhook", request_id: requestId,
      metadata: { orderId: order.id, sessionId, providerStatus, sessionIdMatches: sessionIdReturned === sessionId,
        merchantMatches: sessionMerchant === cfg.merchantId, amountMatches: sessionAmount === Number(order.amount_minor),
        currencyMatches: sessionCurrency === "EGP", orderReferenceMatches: referenceReturned === String(order.provider_reference) },
    });
    if (error) console.error("Kashier session mismatch audit write failed", error.code);
    return respond(200);
  }

  let trustedEvent = "unverified";
  let trustedStatus = "PENDING";
  let trustedTransactionId: string | null = null;
  if (["PAID", "CAPTURED", "SUCCESS"].includes(providerStatus) &&
      capturedMinor === Number(order.amount_minor) && refundedMinor === 0) {
    trustedEvent = "pay";
    trustedStatus = "SUCCESS";
    trustedTransactionId = transactionId;
  } else if (["FAILED", "FAILURE", "EXPIRED", "ABANDONED", "REJECTED"].includes(providerStatus)) {
    trustedEvent = "pay";
    trustedStatus = "FAILURE";
  } else if (["REFUNDED", "REVERSED", "VOIDED"].includes(providerStatus) || refundedMinor > 0) {
    trustedEvent = "refund";
    trustedStatus = "SUCCESS";
  }

  const fingerprint = await sha256Hex([
    signature.toLowerCase(), signaturePayload, sessionIdReturned, providerStatus,
    String(capturedMinor), String(refundedMinor),
  ].join("\n"));
  const { data: result, error } = await admin.rpc("process_kashier_webhook", {
    p_fingerprint: fingerprint,
    p_event_type: trustedEvent,
    p_provider_status: trustedStatus,
    p_provider_reference: String(order.provider_reference),
    p_transaction_id: trustedTransactionId,
    p_amount_minor: Number(order.amount_minor),
    p_currency: "EGP",
    p_merchant_id: sessionMerchant,
    p_expected_merchant_id: cfg.merchantId,
    p_method: typeof data.method === "string" ? data.method : null,
    p_response_code: typeof data.transactionResponseCode === "string" ? data.transactionResponseCode : null,
    p_request_id: requestId,
  });
  if (error || !result || typeof result !== "object") {
    console.error("Kashier webhook reconciliation ledger failed", error?.code ?? "invalid_rpc_response");
    return respond(500);
  }
  const outcome = (result as Record<string, unknown>).result;
  if (["rejected", "unmatched", "transaction_reused", "invalid_transition", "requires_reconciliation"].includes(String(outcome))) {
    console.warn("Kashier webhook flagged for review", { outcome, providerStatus, orderId: order.id });
  }
  return respond(200);
});
