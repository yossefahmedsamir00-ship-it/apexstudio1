import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

function serviceKey() {
  // Prefer the legacy service-role JWT so supabase-js does not send a non-JWT sb_secret as Authorization: Bearer.
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* ignore malformed secret map */ } }
  return undefined;
}
function kashierConfig() {
  const mode = (Deno.env.get("KASHIER_MODE") ?? "test").trim().toLowerCase();
  if (mode !== "test" && mode !== "live") return null;
  const prefix = mode === "test" ? "KASHIER_TEST_" : "KASHIER_LIVE_";
  // Kashier signs payment webhooks with the Payment API Key (not the Secret Key).
  // Require it explicitly so a configuration mistake fails closed instead of silently using the wrong key.
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
  return Math.abs(n * 100 - minor) <= 0.01 ? minor : null;
}

class BodyTooLargeError extends Error {}

async function readBodyTextLimited(req: Request, maxBytes: number): Promise<string> {
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new Error("invalid content length");
    const declaredBytes = Number(declared);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > maxBytes) throw new BodyTooLargeError();
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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { "Cache-Control": "no-store" } });
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return new Response(null, { status: 415 });
  const cfg = kashierConfig();
  const url = Deno.env.get("SUPABASE_URL");
  const key = serviceKey();
  if (!cfg || !url || !key) return new Response(null, { status: 503 });
  let payload: Record<string, unknown>;
  try {
    const rawBody = await readBodyTextLimited(req, 64 * 1024);
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid JSON object");
    payload = parsed as Record<string, unknown>;
  } catch (error) {
    return new Response(null, { status: error instanceof BodyTooLargeError ? 413 : 400, headers: { "Cache-Control": "no-store" } });
  }
  const data = payload?.data as Record<string, unknown> | undefined;
  const signatureKeys = Array.isArray(data?.signatureKeys) ? data!.signatureKeys : Array.isArray(payload.signatureKeys) ? payload.signatureKeys : null;
  const signature = req.headers.get("x-kashier-signature") ?? (typeof payload.signature === "string" ? payload.signature : "");
  if (!data || !signatureKeys || signatureKeys.length < 1 || signatureKeys.length > 60 ||
      signatureKeys.some((k) => typeof k !== "string" || !Object.prototype.hasOwnProperty.call(data, k))) {
    return new Response(null, { status: 401 });
  }
  const sortedKeys = [...signatureKeys as string[]].sort();
  const signaturePayload = sortedKeys.map((k) => `${k}=${encodeURIComponent(String(data[k]))}`).join("&");
  const expected = await hmacHex(cfg.paymentApiKey, signaturePayload);
  if (!equalHex(expected.toLowerCase(), signature.toLowerCase())) {
    console.warn("Rejected Kashier webhook with invalid signature");
    return new Response(null, { status: 401 });
  }
  if (typeof data.merchantId === "string" && data.merchantId !== cfg.merchantId) return new Response(null, { status: 401 });

  const event = typeof payload.event === "string" ? payload.event : "";
  const status = String(data.status ?? "").toUpperCase();
  // The hosted-session `order` value is echoed as orderReference in payment webhook payloads.
  // merchantOrderId may be a provider-generated identifier and must not take precedence.
  const merchantReference = typeof data.orderReference === "string" ? data.orderReference :
    typeof data.merchantOrderId === "string" ? data.merchantOrderId : "";
  const amountMinor = toMinor(data.amount);
  const currency = String(data.currency ?? "").toUpperCase();
  const transactionId = typeof data.transactionId === "string" ? data.transactionId : null;
  if (!merchantReference) return new Response(null, { status: 400 });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error } = await admin.from("payment_orders")
    .select("id,amount_minor,currency,status,provider_reference,provider_transaction_id")
    .eq("provider", "kashier").eq("provider_reference", merchantReference).maybeSingle();
  if (error) {
    console.error("Kashier webhook order lookup failed", error.code);
    return new Response(null, { status: 500 });
  }
  if (!order) {
    console.warn("Kashier webhook reference not found");
    return new Response(null, { status: 404 });
  }
  if (amountMinor !== Number(order.amount_minor) || currency !== "EGP" || order.currency !== "EGP") {
    console.error("Rejected Kashier webhook with mismatched amount or currency", { orderId: order.id });
    return new Response(null, { status: 400 });
  }
  if (event === "pay" && ["SUCCESS", "PAID"].includes(status)) {
    if (order.status === "paid") return new Response(null, { status: 200 });
    const { error: updateError } = await admin.from("payment_orders").update({
      status: "paid",
      provider_transaction_id: transactionId ?? order.provider_transaction_id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider_payload: { verified_by: "kashier_webhook", event, status, transactionResponseCode: data.transactionResponseCode ?? null, method: data.method ?? null },
    }).eq("id", order.id).in("status", ["pending", "checkout_created"]);
    if (updateError) return new Response(null, { status: 500 });
  } else if (event === "refund" && status === "SUCCESS") {
    if (order.status !== "paid") return new Response(null, { status: 200 });
    const { error: updateError } = await admin.from("payment_orders").update({
      status: "refunded", updated_at: new Date().toISOString(),
      provider_payload: { verified_by: "kashier_webhook", event, status, transactionResponseCode: data.transactionResponseCode ?? null },
    }).eq("id", order.id).eq("status", "paid");
    if (updateError) return new Response(null, { status: 500 });
  } else if (["pay", "reject"].includes(event) && ["FAILURE", "FAILED", "REJECTED"].includes(status)) {
    if (order.status !== "paid") {
      const { error: updateError } = await admin.from("payment_orders").update({
        status: "failed", updated_at: new Date().toISOString(),
        provider_payload: { verified_by: "kashier_webhook", event, status, transactionResponseCode: data.transactionResponseCode ?? null },
      }).eq("id", order.id).in("status", ["pending", "checkout_created"]);
      if (updateError) return new Response(null, { status: 500 });
    }
  }
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
});
