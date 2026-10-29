import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const SITE_ORIGIN = "https://yossefahmedsamir00-ship-it.github.io";
const SITE_URL_DEFAULT = "https://yossefahmedsamir00-ship-it.github.io/apexstudio1/";
const cors = (origin: string) => {
  const extra = (Deno.env.get("APEX_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = new Set([SITE_ORIGIN, ...extra]);
  return {
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
};
const respond = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers });
const serviceKey = () => {
  // Prefer the legacy service-role JWT for compatibility with supabase-js Authorization headers.
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* malformed secret map */ } }
  return undefined;
};
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
function toMinor(amount: unknown): number | null {
  const n = typeof amount === "number" ? amount : Number(String(amount ?? ""));
  if (!Number.isFinite(n) || n < 0) return null;
  const rounded = Math.round(n * 100);
  if (Math.abs(n * 100 - rounded) > 0.01) return null;
  return rounded;
}
function config() {
  const mode = (Deno.env.get("KASHIER_MODE") ?? "test").trim().toLowerCase();
  if (mode !== "test" && mode !== "live") return null;
  const p = mode === "test" ? "KASHIER_TEST_" : "KASHIER_LIVE_";
  const apiKey = Deno.env.get(p + "API_KEY");
  const secretKey = Deno.env.get(p + "SECRET_KEY");
  const merchantId = Deno.env.get(p + "MERCHANT_ID");
  const paymentApiKey = Deno.env.get(p + "PAYMENT_API_KEY") ?? apiKey;
  if (!apiKey || !secretKey || !merchantId || !paymentApiKey) return null;
  return {
    mode, apiKey, secretKey, merchantId, paymentApiKey,
    baseUrl: mode === "test" ? "https://test-api.kashier.io" : "https://api.kashier.io",
  };
}
const publicOrder = (order: Record<string, unknown>) => ({
  id: order.id,
  description: order.description,
  amountMinor: Number(order.amount_minor),
  amountEGP: (Number(order.amount_minor) / 100).toFixed(2),
  currency: order.currency,
  status: order.status,
  expiresAt: order.checkout_token_expires_at,
  sessionExpiresAt: order.session_expires_at,
});

class BodyTooLargeError extends Error {}

async function readBodyTextLimited(req: Request, maxBytes: number): Promise<string> {
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    if (!/^\\d+$/.test(declared)) throw new Error("invalid content length");
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
  const origin = req.headers.get("origin") ?? "";
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405, headers);
  if (origin && headers["Access-Control-Allow-Origin"] === "null") return respond({ error: "Origin not allowed" }, 403, headers);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return respond({ error: "Content-Type must be application/json" }, 415, headers);
  let input: Record<string, unknown>;
  try {
    const rawBody = await readBodyTextLimited(req, 8 * 1024);
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid JSON object");
    input = parsed as Record<string, unknown>;
  } catch (error) {
    return respond(
      { error: error instanceof BodyTooLargeError ? "Request too large" : "Invalid JSON" },
      error instanceof BodyTooLargeError ? 413 : 400,
      headers,
    );
  }
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  const token = typeof input.token === "string" ? input.token.trim() : "";
  const action = typeof input.action === "string" ? input.action : "preview";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId) || !/^[0-9a-f]{64}$/i.test(token)) {
    return respond({ error: "This invoice link is invalid." }, 400, headers);
  }
  if (!["preview", "checkout", "status"].includes(action)) return respond({ error: "Unsupported payment action." }, 400, headers);

  const url = Deno.env.get("SUPABASE_URL");
  const key = serviceKey();
  if (!url || !key) return respond({ error: "Payment service is not configured." }, 503, headers);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error } = await admin.from("payment_orders")
    .select("id,inquiry_id,provider,amount_minor,currency,status,checkout_url,checkout_token_hash,checkout_token_expires_at,provider_reference,provider_session_id,session_expires_at,checkout_attempt_count,description,created_at")
    .eq("id", orderId).eq("provider", "kashier").maybeSingle();
  if (error) return respond({ error: "Could not read this invoice." }, 500, headers);
  if (!order || !order.checkout_token_hash || await sha256(token) !== order.checkout_token_hash) {
    return respond({ error: "This invoice link is invalid or has been revoked." }, 404, headers);
  }
  if (new Date(order.checkout_token_expires_at).getTime() < Date.now()) {
    return respond({ error: "This invoice link has expired. Please ask APEX STUDIO for a new link." }, 410, headers);
  }
  if (action === "preview") return respond({ invoice: publicOrder(order) }, 200, headers);

  if (action === "status") {
    if (order.status === "refunded" || !order.provider_session_id) {
      return respond({ invoice: publicOrder(order) }, 200, headers);
    }
    const cfg = config();
    if (!cfg) return respond({ invoice: publicOrder(order), providerStatus: "not_configured" }, 200, headers);

    try {
      // Read the current provider session state, not a browser redirect/event name.
      const upstream = await fetch(
        `${cfg.baseUrl}/v3/payment/sessions/${encodeURIComponent(order.provider_session_id)}`,
        { method: "GET", headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(12000) },
      );
      if (!upstream.ok) return respond({ invoice: publicOrder(order), providerStatus: "pending" }, 200, headers);
      const responseText = await readBoundedText(upstream.body, 256 * 1024, upstream.headers.get("content-length"));
      const parsed: unknown = JSON.parse(responseText);
      if (!isRecord(parsed)) throw new ProviderFailure("invalid_response");

      const sessionId = String(parsed._id ?? "");
      const merchantId = String(parsed.merchantId ?? "");
      const params = isRecord(parsed.paymentParams) ? parsed.paymentParams : {};
      const providerAmount = toMinor(params.amount);
      const currency = String(params.currency ?? "").toUpperCase();
      const capturedMinor = toMinor(parsed.capturedAmount);
      const refundedMinor = toMinor(parsed.refundedAmount);
      const providerStatus = String(parsed.status ?? "").toUpperCase();
      const detailsMatch = sessionId === String(order.provider_session_id) &&
        merchantId === cfg.merchantId &&
        providerAmount === Number(order.amount_minor) &&
        currency === "EGP" &&
        order.currency === "EGP";

      if (!detailsMatch || capturedMinor === null || refundedMinor === null) {
        console.error("Kashier session reconciliation mismatch", { orderId: order.id, providerStatus });
        await admin.from("security_events").insert({
          actor_user_id: null,
          event_type: "kashier_session_reconciliation_mismatch",
          severity: "critical",
          endpoint: "/functions/v1/kashier-payment",
          request_id: crypto.randomUUID(),
          metadata: { orderId: order.id, sessionId, providerStatus, sessionIdMatches: sessionId === String(order.provider_session_id),
            merchantMatches: merchantId === cfg.merchantId, amountMatches: providerAmount === Number(order.amount_minor), currencyMatches: currency === "EGP" },
        });
        return respond({ invoice: publicOrder(order), providerStatus: "verification_required" }, 200, headers);
      }

      const isPaid = ["PAID", "CAPTURED", "SUCCESS"].includes(providerStatus) &&
        capturedMinor === Number(order.amount_minor) && refundedMinor === 0;
      const isFullRefund = ["REFUNDED", "REVERSED", "VOIDED"].includes(providerStatus) &&
        capturedMinor >= Number(order.amount_minor) && refundedMinor >= Number(order.amount_minor);
      const isFailure = ["FAILED", "FAILURE", "EXPIRED", "ABANDONED", "REJECTED"].includes(providerStatus);
      let changedTo: string | null = null;

      if (isPaid) {
        const { data: updated, error: updateError } = await admin.from("payment_orders").update({
          status: "paid",
          paid_at: order.paid_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider_payload: { verified_by: "server_session_status", provider_session_id: sessionId, provider_session_status: providerStatus, captured_minor: capturedMinor, refunded_minor: refundedMinor },
        }).eq("id", order.id).in("status", ["pending", "checkout_created"]).select("id").maybeSingle();
        if (updateError) throw new ProviderFailure("network");
        if (updated) changedTo = "paid";
      } else if (isFullRefund) {
        const { data: updated, error: updateError } = await admin.from("payment_orders").update({
          status: "refunded",
          paid_at: order.paid_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider_payload: { verified_by: "server_session_status", provider_session_id: sessionId, provider_session_status: providerStatus, captured_minor: capturedMinor, refunded_minor: refundedMinor },
        }).eq("id", order.id).in("status", ["pending", "checkout_created", "paid", "failed"]).select("id").maybeSingle();
        if (updateError) throw new ProviderFailure("network");
        if (updated) changedTo = "refunded";
      } else if (isFailure && ["pending", "checkout_created"].includes(String(order.status))) {
        const { data: updated, error: updateError } = await admin.from("payment_orders").update({
          status: "failed",
          updated_at: new Date().toISOString(),
          provider_payload: { verified_by: "server_session_status", provider_session_id: sessionId, provider_session_status: providerStatus },
        }).eq("id", order.id).in("status", ["pending", "checkout_created"]).select("id").maybeSingle();
        if (updateError) throw new ProviderFailure("network");
        if (updated) changedTo = "failed";
      } else if (refundedMinor > 0 && !isFullRefund) {
        await admin.from("security_events").insert({
          actor_user_id: null,
          event_type: "kashier_partial_refund_requires_review",
          severity: "high",
          endpoint: "/functions/v1/kashier-payment",
          request_id: crypto.randomUUID(),
          metadata: { orderId: order.id, capturedMinor, refundedMinor, providerStatus },
        });
        const { data: latest } = await admin.from("payment_orders").select("*").eq("id", order.id).single();
        return respond({ invoice: publicOrder(latest ?? order), providerStatus: "partial_refund_requires_review" }, 200, headers);
      }

      if (changedTo) {
        const { error: auditError } = await admin.from("audit_logs").insert({
          actor_user_id: null,
          action: "payment_status_reconciled",
          target_type: "payment_order",
          target_id: String(order.id),
          metadata: { verifiedBy: "kashier_session_api", previousStatus: order.status, newStatus: changedTo, providerStatus, capturedMinor, refundedMinor },
        });
        if (auditError) console.error("Payment reconciliation audit insert failed", auditError.code);
      }

      const { data: latest } = await admin.from("payment_orders").select("*").eq("id", order.id).single();
      return respond({ invoice: publicOrder(latest ?? order), providerStatus: providerStatus || "pending" }, 200, headers);
    } catch (error) {
      console.error("Kashier session status check failed", error instanceof Error ? error.name : "unknown");
      return respond({ invoice: publicOrder(order), providerStatus: "pending" }, 200, headers);
    }
  }

  if (order.status === "paid") return respond({ error: "This invoice has already been paid.", invoice: publicOrder(order) }, 409, headers);
  if (!["pending", "checkout_created"].includes(order.status)) return respond({ error: "This invoice is no longer payable.", invoice: publicOrder(order) }, 409, headers);
  if (order.status === "checkout_created" && order.checkout_url && order.session_expires_at && new Date(order.session_expires_at).getTime() > Date.now() + 120000) {
    return respond({ checkoutUrl: order.checkout_url, invoice: publicOrder(order), reusedSession: true }, 200, headers);
  }
  if (Number(order.checkout_attempt_count) >= 8) return respond({ error: "Too many checkout attempts. Please contact APEX STUDIO for a new invoice." }, 429, headers);
  const cfg = config();
  if (!cfg) return respond({ error: "Secure checkout is not configured yet. APEX STUDIO needs to finish its Kashier test setup first." }, 503, headers);

  const siteBase = Deno.env.get("APEX_SITE_URL") ?? SITE_URL_DEFAULT;
  const site = siteBase.endsWith("/") ? siteBase : siteBase + "/";
  const redirect = new URL("payment.html", site);
  redirect.searchParams.set("orderId", order.id);
  redirect.searchParams.set("token", token);
  redirect.searchParams.set("return", "1");
  const expiry = new Date(Date.now() + 30 * 60 * 1000);
  const providerReference = `APX-${order.id.slice(0, 8).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  let customerEmail: string | undefined;
  if (order.inquiry_id) {
    const { data: inquiry } = await admin.from("project_inquiries").select("client_email").eq("id", order.inquiry_id).maybeSingle();
    if (inquiry?.client_email) customerEmail = inquiry.client_email;
  }
  const webhookUrl = Deno.env.get("KASHIER_WEBHOOK_URL") ?? `${url}/functions/v1/kashier-webhook`;
  const payload: Record<string, unknown> = {
    expireAt: expiry.toISOString(),
    maxFailureAttempts: 3,
    paymentType: "credit",
    amount: (Number(order.amount_minor) / 100).toFixed(2),
    currency: "EGP",
    order: providerReference,
    merchantRedirect: encodeURIComponent(redirect.toString()),
    display: "en",
    type: "one-time",
    allowedMethods: cfg.mode === "test" ? "card,wallet" : "card,bank_installments,wallet,bnpl",
    merchantId: cfg.merchantId,
    failureRedirect: false,
    enable3DS: true,
    serverWebhook: webhookUrl,
    description: order.description,
    customer: { reference: order.id, ...(customerEmail ? { email: customerEmail } : {}) },
    metaData: { apexOrderId: order.id },
  };
  try {
    const upstream = await fetch(`${cfg.baseUrl}/v3/payment/sessions`, {
      method: "POST",
      headers: { Authorization: cfg.secretKey, "api-key": cfg.apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(18000),
    });
    const raw = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Kashier session creation failed", { status: upstream.status });
      return respond({ error: "Kashier could not create checkout. Verify the test merchant keys and try again." }, 502, headers);
    }
    const result = raw?.data ?? raw;
    const sessionUrl = result?.sessionUrl ?? raw?.sessionUrl;
    const sessionId = result?._id ?? result?.sessionId ?? raw?._id ?? raw?.sessionId ??
      (typeof sessionUrl === "string" ? sessionUrl.match(/\/session\/([^/?]+)/)?.[1] : null);
    if (typeof sessionUrl !== "string" || !/^https:\/\/payments\.kashier\.io\//i.test(sessionUrl) || typeof sessionId !== "string" || !sessionId) {
      console.error("Kashier response shape missing checkout fields");
      return respond({ error: "Kashier returned an incomplete checkout response. No payment status was changed." }, 502, headers);
    }
    const { data: updated, error: updateError } = await admin.from("payment_orders").update({
      status: "checkout_created",
      checkout_url: sessionUrl,
      provider_reference: providerReference,
      provider_session_id: sessionId,
      session_expires_at: expiry.toISOString(),
      checkout_attempt_count: Number(order.checkout_attempt_count) + 1,
      updated_at: new Date().toISOString(),
      provider_payload: { mode: cfg.mode, provider_session_id: sessionId, session_expires_at: expiry.toISOString() },
    }).eq("id", order.id).in("status", ["pending", "checkout_created"]).select("id").maybeSingle();
    if (updateError || !updated) {
      console.error("Could not record Kashier session", { orderId: order.id });
      return respond({ error: "Checkout was created but could not be safely recorded. Contact APEX STUDIO before paying again." }, 500, headers);
    }
    const { data: latest } = await admin.from("payment_orders").select("*").eq("id", order.id).single();
    return respond({ checkoutUrl: sessionUrl, invoice: publicOrder(latest ?? { ...order, status: "checkout_created", checkout_url: sessionUrl }) }, 200, headers);
  } catch {
    return respond({ error: "The payment provider is temporarily unavailable. Please try again later." }, 502, headers);
  }
});
