import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const OWNER_EMAIL = "yossefahmedsamir00@gmail.com";
const SITE_ORIGIN = "https://yossefahmedsamir00-ship-it.github.io";
const cors = (origin: string) => {
  const extra = (Deno.env.get("APEX_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = new Set([SITE_ORIGIN, ...extra]);
  const ok = origin && allowed.has(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : "null",
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
const secretKey = () => {
  // The legacy service-role key is a JWT and is compatible with supabase-js client Authorization handling.
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* ignore malformed secret map */ } }
  return undefined;
};
const publishableKey = () => {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* use legacy variable */ } }
  return Deno.env.get("SUPABASE_ANON_KEY");
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405, headers);
  if (origin && headers["Access-Control-Allow-Origin"] === "null") return respond({ error: "Origin not allowed" }, 403, headers);

  const url = Deno.env.get("SUPABASE_URL");
  const pubKey = publishableKey();
  const adminKey = secretKey();
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !pubKey || !adminKey) return respond({ error: "Owner setup is unavailable." }, 503, headers);
  if (!token) return respond({ error: "Sign in to continue." }, 401, headers);

  const userClient = createClient(url, pubKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user || !user.email_confirmed_at) return respond({ error: "A verified email login is required." }, 401, headers);
  if ((user.email ?? "").trim().toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return respond({ error: "This account is not the configured APEX owner email." }, 403, headers);
  }

  const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: current, error: readError } = await admin
    .from("apex_owner_settings").select("id,owner_user_id").eq("id", true).maybeSingle();
  if (readError) return respond({ error: "Could not verify owner setup." }, 500, headers);
  if (current?.owner_user_id) {
    if (current.owner_user_id === user.id) return respond({ configured: true, message: "Owner account is already configured." }, 200, headers);
    return respond({ error: "The APEX owner is already configured." }, 409, headers);
  }

  if (current) {
    const { data: updated, error } = await admin
      .from("apex_owner_settings").update({ owner_user_id: user.id }).eq("id", true).is("owner_user_id", null).select("owner_user_id").maybeSingle();
    if (error) return respond({ error: "Could not claim owner access." }, 500, headers);
    if (updated?.owner_user_id === user.id) return respond({ configured: true }, 200, headers);
  } else {
    const { error } = await admin.from("apex_owner_settings").insert({ id: true, owner_user_id: user.id });
    if (!error) return respond({ configured: true }, 200, headers);
  }

  const { data: finalRow } = await admin.from("apex_owner_settings").select("owner_user_id").eq("id", true).maybeSingle();
  if (finalRow?.owner_user_id === user.id) return respond({ configured: true }, 200, headers);
  return respond({ error: "Owner setup was claimed by a different account. Contact the configured administrator." }, 409, headers);
});
