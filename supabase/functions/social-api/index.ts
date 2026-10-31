import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const SITE_ORIGIN = "https://yossefahmedsamir00-ship-it.github.io";
const TENANT_SLUG = "apex-studio";
const MAX_BODY = 64 * 1024;
const json = (body: unknown, status: number, headers: Record<string,string>) =>
  new Response(JSON.stringify(body), { status, headers });

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const extras = (Deno.env.get("APEX_FRONTEND_ORIGIN") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const allowed = new Set([SITE_ORIGIN, ...extras]);
  const ok = !!origin && allowed.has(origin);
  return {
    ok,
    headers: {
      "Access-Control-Allow-Origin": ok ? origin : "null",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    } as Record<string,string>,
  };
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const length = req.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BODY) throw new Error("too_large");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > MAX_BODY) throw new Error("too_large");
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
  return parsed as Record<string, unknown>;
}

function clientKey() {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* ignore */ } }
  return Deno.env.get("SUPABASE_ANON_KEY");
}
function adminKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* ignore */ } }
  return undefined;
}
function requireString(value: unknown, max: number, name: string) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`invalid_${name}`);
  return value.trim();
}
function safePlatforms(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) throw new Error("invalid_platforms");
  const allowed = new Set(["instagram", "x", "tiktok", "youtube"]);
  const result = value.map((v) => String(v).toLowerCase());
  if (result.some((v) => !allowed.has(v))) throw new Error("invalid_platforms");
  return [...new Set(result)];
}

async function getContext(req: Request) {
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const pubKey = clientKey();
  const serviceKey = adminKey();
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!projectUrl || !pubKey || !serviceKey || !token) throw new Error("unauthorized");
  const auth = createClient(projectUrl, pubKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authHeader } } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");
  const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: tenant, error: tenantError } = await admin.from("social_tenants").select("id,slug,display_name,status").eq("slug", TENANT_SLUG).maybeSingle();
  if (tenantError || !tenant || tenant.status !== "active") throw new Error("tenant_unavailable");
  const { data: membership, error: memberError } = await admin.from("social_memberships").select("id,role").eq("tenant_id", tenant.id).eq("user_id", data.user.id).maybeSingle();
  if (memberError || !membership) throw new Error("forbidden");
  return { admin, user: data.user, tenant, role: membership.role as string, token, projectUrl, pubKey };
}

function canWrite(role: string) { return ["owner", "admin", "editor"].includes(role); }
function canApprove(role: string) { return ["owner", "admin"].includes(role); }

async function audit(ctx: Awaited<ReturnType<typeof getContext>>, action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown> = {}) {
  await ctx.admin.from("social_audit_events").insert({ tenant_id: ctx.tenant.id, actor_user_id: ctx.user.id, action, target_type: targetType, target_id: targetId, request_id: crypto.randomUUID(), metadata });
}

async function invokeGateway(ctx: Awaited<ReturnType<typeof getContext>>, prompt: string, agent = "copy") {
  const response = await fetch(`${ctx.projectUrl}/functions/v1/apex-ai-gateway`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${ctx.token}`, "apikey": ctx.pubKey, "Content-Type": "application/json", "Origin": SITE_ORIGIN },
    body: JSON.stringify({ agent, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "ai_gateway_failed");
  return typeof payload.content === "string" ? payload.content.trim() : "";
}

function extractJson(text: string): Record<string, unknown> | null {
  try { const direct = JSON.parse(text); return direct && typeof direct === "object" && !Array.isArray(direct) ? direct : null; } catch { /* continue */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { const parsed = JSON.parse(match[0]); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null; } catch { return null; }
}

Deno.serve(async (req) => {
  const { ok, headers } = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  if (!ok) return json({ error: "Origin not allowed" }, 403, headers);
  if ((req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: "Content-Type must be application/json" }, 415, headers);

  let ctx: Awaited<ReturnType<typeof getContext>>;
  let body: Record<string, unknown>;
  try { body = await readBody(req); } catch (error) {
    return json({ error: error instanceof Error && error.message === "too_large" ? "Request too large" : "Invalid request body" }, error instanceof Error && error.message === "too_large" ? 413 : 400, headers);
  }
  try { ctx = await getContext(req); } catch (error) {
    const code = error instanceof Error ? error.message : "unauthorized";
    const status = code === "forbidden" ? 403 : code === "tenant_unavailable" ? 503 : 401;
    return json({ error: status === 403 ? "You do not have access to this workspace." : status === 503 ? "Social workspace is temporarily unavailable." : "Please sign in again." }, status, headers);
  }

  const action = typeof body.action === "string" ? body.action : "overview";
  try {
    if (action === "overview") {
      const [campaigns, content, accounts, analytics] = await Promise.all([
        ctx.admin.from("social_campaigns").select("id,name,status,objective,created_at,updated_at").eq("tenant_id", ctx.tenant.id).order("created_at", { ascending: false }).limit(20),
        ctx.admin.from("social_content_items").select("id,title,content_type,status,scheduled_at,created_at,updated_at").eq("tenant_id", ctx.tenant.id).order("created_at", { ascending: false }).limit(50),
        ctx.admin.from("social_accounts").select("id,platform,account_name,connection_status,last_verified_at,last_error_code").eq("tenant_id", ctx.tenant.id).order("platform"),
        ctx.admin.from("social_analytics_snapshots").select("platform,metric_key,metric_value,period_end").eq("tenant_id", ctx.tenant.id).order("period_end", { ascending: false }).limit(100),
      ]);
      return json({ ok: true, tenant: ctx.tenant, role: ctx.role, campaigns: campaigns.data ?? [], content: content.data ?? [], accounts: accounts.data ?? [], analytics: analytics.data ?? [] }, 200, headers);
    }

    if (action === "content.list") {
      const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 100);
      const { data, error } = await ctx.admin.from("social_content_items").select("id,title,content_type,status,timezone,scheduled_at,created_at,updated_at,social_content_versions(id,version_number,body,platform_variants,ai_metadata,created_by,created_at)").eq("tenant_id", ctx.tenant.id).order("updated_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return json({ ok: true, items: data ?? [] }, 200, headers);
    }

    if (action === "content.generate") {
      if (!canWrite(ctx.role)) return json({ error: "Editor permission is required." }, 403, headers);
      const title = requireString(body.title, 160, "title");
      const brief = requireString(body.brief, 6000, "brief");
      const platforms = safePlatforms(body.platforms);
      const contentType = typeof body.contentType === "string" ? body.contentType : "post";
      const prompt = `Create an APEX STUDIO social content package. Return ONLY valid JSON with keys: body (string), platform_variants (object keyed by platform), hook (string), cta (string), hashtags (array of strings), visual_idea (string), approval_notes (array of strings). Title: ${title}. Brief: ${brief}. Content type: ${contentType}. Platforms: ${platforms.join(", ")}. Keep it brand-safe, premium, practical, and truthful. Do not invent metrics, testimonials, clients, prices, or partnerships.`;
      const raw = await invokeGateway(ctx, prompt, "copy");
      const parsed = extractJson(raw);
      const bodyText = typeof parsed?.body === "string" ? parsed.body : raw;
      const variants = parsed?.platform_variants && typeof parsed.platform_variants === "object" ? parsed.platform_variants : Object.fromEntries(platforms.map((p) => [p, bodyText]));
      const aiMetadata = { hook: parsed?.hook ?? "", cta: parsed?.cta ?? "", hashtags: Array.isArray(parsed?.hashtags) ? parsed.hashtags.slice(0, 20) : [], visual_idea: parsed?.visual_idea ?? "", approval_notes: Array.isArray(parsed?.approval_notes) ? parsed.approval_notes.slice(0, 10) : [], generated_by: "apex-ai-gateway", generated_at: new Date().toISOString(), platforms };
      const { data: item, error: itemError } = await ctx.admin.from("social_content_items").insert({ tenant_id: ctx.tenant.id, title, content_type: contentType, status: "draft", created_by: ctx.user.id, updated_by: ctx.user.id }).select("id,title,content_type,status,created_at").single();
      if (itemError || !item) throw itemError ?? new Error("content_create_failed");
      const { data: version, error: versionError } = await ctx.admin.from("social_content_versions").insert({ tenant_id: ctx.tenant.id, content_item_id: item.id, version_number: 1, body: bodyText, platform_variants: variants, ai_metadata: aiMetadata, created_by: ctx.user.id }).select("id,version_number,body,platform_variants,ai_metadata,created_at").single();
      if (versionError) throw versionError;
      await audit(ctx, "content.generated", "social_content_item", item.id, { version_id: version?.id, platforms });
      return json({ ok: true, item, version }, 200, headers);
    }

    if (action === "content.version") {
      if (!canWrite(ctx.role)) return json({ error: "Editor permission is required." }, 403, headers);
      const itemId = requireString(body.contentItemId, 80, "contentItemId");
      const text = requireString(body.body, 20000, "body");
      const { data: item } = await ctx.admin.from("social_content_items").select("id,status").eq("id", itemId).eq("tenant_id", ctx.tenant.id).maybeSingle();
      if (!item) return json({ error: "Content item not found." }, 404, headers);
      const { data: latest } = await ctx.admin.from("social_content_versions").select("version_number").eq("content_item_id", itemId).eq("tenant_id", ctx.tenant.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
      const next = Number(latest?.version_number ?? 0) + 1;
      const { data: version, error } = await ctx.admin.from("social_content_versions").insert({ tenant_id: ctx.tenant.id, content_item_id: itemId, version_number: next, body: text, platform_variants: typeof body.platformVariants === "object" && body.platformVariants ? body.platformVariants : {}, ai_metadata: { source: "owner_edit" }, created_by: ctx.user.id }).select("id,version_number,body,platform_variants,ai_metadata,created_at").single();
      if (error) throw error;
      await ctx.admin.from("social_content_items").update({ status: "draft", updated_by: ctx.user.id }).eq("id", itemId).eq("tenant_id", ctx.tenant.id);
      await audit(ctx, "content.version_created", "social_content_item", itemId, { version_number: next });
      return json({ ok: true, version }, 200, headers);
    }

    if (action === "approval.decide") {
      if (!canApprove(ctx.role)) return json({ error: "Owner/admin approval is required." }, 403, headers);
      const itemId = requireString(body.contentItemId, 80, "contentItemId");
      const versionId = requireString(body.contentVersionId, 80, "contentVersionId");
      const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;
      if (!decision) return json({ error: "Decision must be approved or rejected." }, 400, headers);
      const platforms = Array.isArray(body.approvedPlatforms) ? body.approvedPlatforms.map(String).slice(0, 4) : [];
      const { data: version } = await ctx.admin.from("social_content_versions").select("id,content_item_id,version_number").eq("id", versionId).eq("content_item_id", itemId).eq("tenant_id", ctx.tenant.id).maybeSingle();
      if (!version) return json({ error: "Content version not found." }, 404, headers);
      const { data: approval, error } = await ctx.admin.from("social_approvals").insert({ tenant_id: ctx.tenant.id, content_item_id: itemId, content_version_id: versionId, decision, decided_by: ctx.user.id, comment: typeof body.comment === "string" ? body.comment.slice(0, 2000) : null, approved_platforms: platforms }).select("id,decision,content_version_id,decided_by,decided_at,comment,approved_platforms").single();
      if (error) throw error;
      await ctx.admin.from("social_content_items").update({ status: decision, updated_by: ctx.user.id }).eq("id", itemId).eq("tenant_id", ctx.tenant.id);
      await audit(ctx, `content.${decision}`, "social_content_item", itemId, { version_id: versionId, platforms });
      return json({ ok: true, approval }, 200, headers);
    }

    if (action === "brand.brain") {
      const question = requireString(body.question, 4000, "question");
      const { data: docs } = await ctx.admin.from("social_brand_documents").select("id,title,document_type,source_url,summary,content,created_at,updated_at").eq("tenant_id", ctx.tenant.id).order("updated_at", { ascending: false }).limit(20);
      const context = (docs ?? []).map((doc) => `TITLE: ${doc.title}\nTYPE: ${doc.document_type}\nSUMMARY: ${doc.summary ?? ""}\nCONTENT: ${String(doc.content ?? "").slice(0, 6000)}`).join("\n---\n");
      const prompt = `You are APEX STUDIO Brand Brain. Answer the owner's brand question using only the supplied source context. If evidence is missing, say so. Do not invent customer data, competitors, metrics, prices, or brand facts. Question: ${question}\nSOURCE CONTEXT:\n${context || "No brand documents have been added yet."}`;
      const answer = await invokeGateway(ctx, prompt, "research");
      await audit(ctx, "brand_brain.query", "brand_brain", null, { question: question.slice(0, 500) });
      return json({ ok: true, answer, sources: docs ?? [] }, 200, headers);
    }

    if (action === "brand.document.create") {
      if (!canWrite(ctx.role)) return json({ error: "Editor permission is required." }, 403, headers);
      const title = requireString(body.title, 200, "title");
      const content = requireString(body.content, 30000, "content");
      const type = typeof body.documentType === "string" ? body.documentType.slice(0, 60) : "brand_note";
      const { data, error } = await ctx.admin.from("social_brand_documents").insert({ tenant_id: ctx.tenant.id, title, document_type: type, source_url: typeof body.sourceUrl === "string" ? body.sourceUrl.slice(0, 1000) : null, content, summary: typeof body.summary === "string" ? body.summary.slice(0, 2000) : null, created_by: ctx.user.id, updated_by: ctx.user.id }).select("id,title,document_type,source_url,summary,content,created_at,updated_at").single();
      if (error) throw error;
      await audit(ctx, "brand_document.created", "social_brand_document", data.id);
      return json({ ok: true, document: data }, 200, headers);
    }

    if (action === "ugc.generate") {
      if (!canWrite(ctx.role)) return json({ error: "Editor permission is required." }, 403, headers);
      const brief = requireString(body.brief, 6000, "brief");
      const prompt = `Create a UGC production brief for APEX STUDIO. Return valid JSON with hook, shot_list (array), voice_over, on_screen_text (array), b_roll (array), cta, filming_notes, compliance_notes. Brief: ${brief}. Do not invent claims or testimonials.`;
      const raw = await invokeGateway(ctx, prompt, "copy");
      const parsed = extractJson(raw) ?? { hook: raw, shot_list: [], voice_over: "", on_screen_text: [], b_roll: [], cta: "", filming_notes: "", compliance_notes: [] };
      const { data, error } = await ctx.admin.from("social_ugc_briefs").insert({ tenant_id: ctx.tenant.id, title: typeof body.title === "string" ? body.title.slice(0, 200) : "UGC Brief", brief, payload: parsed, created_by: ctx.user.id }).select("id,title,brief,payload,created_at").single();
      if (error) throw error;
      await audit(ctx, "ugc.generated", "social_ugc_brief", data.id);
      return json({ ok: true, brief: data }, 200, headers);
    }

    if (action === "ads.summary") {
      const { data: snapshots } = await ctx.admin.from("social_analytics_snapshots").select("platform,metric_key,metric_value,period_start,period_end,metadata").eq("tenant_id", ctx.tenant.id).eq("platform", "facebook").order("period_end", { ascending: false }).limit(200);
      const connected = (await ctx.admin.from("social_accounts").select("id,platform,account_name,connection_status,last_verified_at,last_error_code").eq("tenant_id", ctx.tenant.id).eq("platform", "facebook")).data ?? [];
      return json({ ok: true, mode: "read_only", message: "Meta Ads Intelligence is read-only until an official Marketing API connector is configured and approved.", accounts: connected, snapshots: snapshots ?? [] }, 200, headers);
    }

    return json({ error: "Unsupported action" }, 400, headers);
  } catch (error) {
    console.error("social-api error", error instanceof Error ? error.message : error);
    return json({ error: "Social AI request failed. Please retry." }, 500, headers);
  }
});
