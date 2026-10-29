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
  };
};
const respond = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers });
const adminKey = () => {
  // Prefer the legacy service-role JWT for compatibility with supabase-js Authorization headers.
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* malformed secret map */ } }
  return undefined;
};
const publicKey = () => {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* legacy fallback */ } }
  return Deno.env.get("SUPABASE_ANON_KEY");
};
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
function makeToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405, headers);
  if (origin && headers["Access-Control-Allow-Origin"] === "null") return respond({ error: "Origin not allowed" }, 403, headers);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return respond({ error: "Content-Type must be application/json" }, 415, headers);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = publicKey();
  const service = adminKey();
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !anon || !service) return respond({ error: "Payment invoice service is not configured." }, 503, headers);
  if (!token) return respond({ error: "Sign in as the APEX owner to create invoices." }, 401, headers);

  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData.user) return respond({ error: "Your session is invalid. Please sign in again." }, 401, headers);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ownerSetting, error: ownerError } = await admin
    .from("apex_owner_settings").select("owner_user_id").eq("id", true).maybeSingle();
  if (ownerError || !ownerSetting || ownerSetting.owner_user_id !== userData.user.id) {
    return respond({ error: "Owner access is not configured for this account." }, 403, headers);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respond({ error: "Invalid JSON." }, 400, headers); }
  const amount = typeof body.amountEGP === "number" ? body.amountEGP : Number(String(body.amountEGP ?? ""));
  if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) return respond({ error: "Enter an invoice amount from EGP 1 to EGP 1,000,000." }, 400, headers);
  const amountMinor = Math.round(amount * 100);
  if (Math.abs(amount * 100 - amountMinor) > 0.001) return respond({ error: "Amount must have at most two decimal places." }, 400, headers);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 3 || description.length > 300) return respond({ error: "Description must be between 3 and 300 characters." }, 400, headers);
  const inquiryId = typeof body.inquiryId === "string" && body.inquiryId.trim() ? body.inquiryId.trim() : null;
  if (inquiryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inquiryId)) {
    return respond({ error: "Invalid project inquiry reference." }, 400, headers);
  }

  if (inquiryId) {
    const { data: inquiry, error } = await admin.from("project_inquiries").select("id,status").eq("id", inquiryId).maybeSingle();
    if (error) return respond({ error: "Could not validate the project inquiry." }, 500, headers);
    if (!inquiry) return respond({ error: "The selected project inquiry was not found." }, 404, headers);
  }

  const rawToken = makeToken();
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: order, error: insertError } = await admin.from("payment_orders").insert({
    inquiry_id: inquiryId,
    provider: "kashier",
    amount_minor: amountMinor,
    currency: "EGP",
    status: "pending",
    description,
    checkout_token_hash: await sha256(rawToken),
    checkout_token_expires_at: expiry,
  }).select("id,amount_minor,currency,status,description,created_at,checkout_token_expires_at").single();
  if (insertError || !order) {
    console.error("invoice creation failed", insertError?.code ?? "unknown");
    return respond({ error: "Could not create this invoice. Please retry." }, 500, headers);
  }

  const base = Deno.env.get("APEX_SITE_URL") ?? SITE_URL_DEFAULT;
  const link = new URL("payment.html", base.endsWith("/") ? base : base + "/");
  link.searchParams.set("orderId", order.id);
  link.searchParams.set("token", rawToken);
  return respond({
    invoice: { ...order, amount_egp: (Number(order.amount_minor) / 100).toFixed(2) },
    checkoutUrl: link.toString(),
    expiresAt: expiry,
    tokenShownOnce: true,
  }, 201, headers);
});
