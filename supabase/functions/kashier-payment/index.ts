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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405, headers);
  if (origin && headers["Access-Control-Allow-Origin"] === "null") return respond({ error: "Origin not allowed" }, 403, headers);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return respond({ error: "Content-Type must be application/json" }, 415, headers);
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (declaredLength > 8000) return respond({ error: "Request too large" }, 413, headers);

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return respond({ error: "Invalid JSON" }, 400, headers); }
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
    if (order.status === "paid" || order.status === "refunded" || !order.provider_session_id) {
      return respond({ invoice: publicOrder(order) }, 200, headers);
    }
    const cfg = config();
    if (!cfg) return respond({ invoice: publicOrder(order), providerStatus: "not_configured" }, 200, headers);
    try {
      const upstream = await fetch(`${cfg.baseUrl}/v3/payment/sessions/${encodeURIComponent(order.provider_session_id)}/payment`, {
        method: "GET", headers: { Authorization: cfg.secretKey, Accept: "application/json" }, signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) return respond({ invoice: publicOrder(order), providerStatus: "pending" }, 200, headers);
      const raw = await upstream.json();
      const payment = raw?.data ?? raw;
      const providerStatus = String(payment?.status ?? "").toUpperCase();
      const providerOrder = payment?.merchantOrderId ?? payment?.orderReference ?? payment?.order;
      const providerAmount = toMinor(payment?.amount);
      const currency = String(payment?.currency ?? "").toUpperCase();
      const orderMatches = typeof providerOrder === "string" && providerOrder === order.provider_reference;
      const moneyMatches = providerAmount === Number(order.amount_minor) && currency === "EGP";
      if (["SUCCESS", "PAID", "CAPTURED"].includes(providerStatus)) {
        if (!orderMatches || !moneyMatches) {
          console.error("Kashier status reconciliation mismatch", { orderId, providerStatus });
          return respond({ invoice: publicOrder(order), providerStatus: "verification_required" }, 200, headers);
        }
        const transactionId = typeof payment?.transactionId === "string" ? payment.transactionId : null;
        const { data: updated } = await admin.from("payment_orders").update({
          status: "paid", provider_transaction_id: transactionId, paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(), provider_payload: { verified_by: "server_status_api", status: providerStatus },
        }).eq("id", order.id).in("status", ["pending", "checkout_created"]).select("id").maybeSingle();
        if (updated) {
          const { data: latest } = await admin.from("payment_orders").select("*").eq("id", order.id).single();
          return respond({ invoice: publicOrder(latest ?? { ...order, status: "paid" }), providerStatus }, 200, headers);
        }
      } else if (["FAILURE", "FAILED", "REJECTED", "EXPIRED", "ABANDONED"].includes(providerStatus) && order.status !== "paid") {
        if (!orderMatches || (providerAmount !== null && providerAmount !== Number(order.amount_minor)) || (currency && currency !== "EGP")) {
          return respond({ invoice: publicOrder(order), providerStatus: "verification_required" }, 200, headers);
        }
        await admin.from("payment_orders").update({
          status: "failed", updated_at: new Date().toISOString(),
          provider_payload: { verified_by: "server_status_api", status: providerStatus },
        }).eq("id", order.id).in("status", ["pending", "checkout_created"]);
      }
      const { data: latest } = await admin.from("payment_orders").select("*").eq("id", order.id).single();
      return respond({ invoice: publicOrder(latest ?? order), providerStatus: providerStatus || "pending" }, 200, headers);
    } catch {
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
