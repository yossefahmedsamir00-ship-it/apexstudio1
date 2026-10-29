import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

function serviceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* legacy fallback */ } }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}
function kashierConfig() {
  const mode = (Deno.env.get("KASHIER_MODE") ?? "test").trim().toLowerCase();
  if (mode !== "test" && mode !== "live") return null;
  const prefix = mode === "test" ? "KASHIER_TEST_" : "KASHIER_LIVE_";
  const apiKey = Deno.env.get(prefix + "API_KEY");
  const paymentApiKey = Deno.env.get(prefix + "PAYMENT_API_KEY") ?? apiKey;
  const merchantId = Deno.env.get(prefix + "MERCHANT_ID");
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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { "Cache-Control": "no-store" } });
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return new Response(null, { status: 415 });
  const cfg = kashierConfig();
  const url = Deno.env.get("SUPABASE_URL");
  const key = serviceKey();
  if (!cfg || !url || !key) return new Response(null, { status: 503 });
  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return new Response(null, { status: 400 }); }
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
  const merchantReference = typeof data.merchantOrderId === "string" ? data.merchantOrderId :
    typeof data.orderReference === "string" ? data.orderReference : "";
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
