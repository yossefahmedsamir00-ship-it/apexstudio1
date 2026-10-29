import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const SITE_ORIGIN = "https://yossefahmedsamir00-ship-it.github.io";
const OWNER_STATUSES = new Set(["open", "waiting_owner", "ai_handled", "waiting_client", "closed", "escalated"]);
const cors = (origin: string) => {
  const extras = (Deno.env.get("APEX_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const allowed = new Set([SITE_ORIGIN, ...extras]);
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
const respond = (body: unknown, status: number, headers: Record<string,string>) =>
  new Response(JSON.stringify(body), { status, headers });
const serverKey = () => {
  // Prefer the legacy JWT service-role key so supabase-js does not use a non-JWT sb_secret as Authorization.
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* ignore malformed map */ } }
  return undefined;
};
const clientKey = () => {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) { try { return JSON.parse(raw).default as string | undefined; } catch { /* ignore malformed map */ } }
  return Deno.env.get("SUPABASE_ANON_KEY");
};
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const clip = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0,max) : "";
async function sha256(v: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2,"0")).join("");
}
async function ipRateLimitSubject(req: Request, salt: string): Promise<string | null> {
  // Cloudflare supplies this header at the edge. Never log the raw address; use a keyed pseudonymous UUID.
  const ip = (req.headers.get("cf-connecting-ip") ?? "").trim();
  if (!/^[0-9a-fA-F:.]{3,64}$/.test(ip)) return null;
  const digest = await sha256(salt + ":apex-ip-limit:" + ip);
  const chars = digest.slice(0,32).split("");
  chars[12] = "4";
  chars[16] = ["8","9","a","b"][parseInt(chars[16],16) & 3];
  const hex = chars.join("");
  return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
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
async function writeSecurityEvent(admin: ReturnType<typeof createClient>, req: Request, input: {
  actorUserId?: string | null; eventType: string; severity?: string; endpoint?: string;
  metadata?: Record<string,unknown>;
}) {
  const result = await admin.from("security_events").insert({
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    severity: input.severity ?? "info",
    endpoint: input.endpoint ?? "/functions/v1/apex-client-chat",
    request_id: crypto.randomUUID(),
    origin: clip(req.headers.get("origin"), 200) || null,
    user_agent: clip(req.headers.get("user-agent"), 400) || null,
    metadata: input.metadata ?? {},
  });
  if (result.error) console.error("APEX security event write failed", result.error.code);
}
async function writeAudit(admin: ReturnType<typeof createClient>, actor: string, action: string, targetType: string, targetId: string, metadata: Record<string,unknown> = {}) {
  const result = await admin.from("audit_logs").insert({
    actor_user_id: actor, action, target_type: targetType, target_id: targetId, metadata,
  });
  if (result.error) console.error("APEX audit write failed", result.error.code);
}
async function consumeRateLimit(admin: ReturnType<typeof createClient>, req: Request, userId: string, bucket: string, limit: number, subjectId: string = userId) {
  const { data, error } = await admin.rpc("apex_consume_rate_limit", {
    p_subject_id: subjectId, p_bucket: bucket, p_window_seconds: 60, p_limit: limit,
  });
  if (error) {
    console.error("APEX rate limiter unavailable", error.code);
    await writeSecurityEvent(admin, req, { actorUserId: userId, eventType: "rate_limiter_unavailable", severity: "high", metadata: { bucket } });
    return false; // fail closed for message creation and AI usage
  }
  if (data !== true) {
    await writeSecurityEvent(admin, req, { actorUserId: userId, eventType: "rate_limit_exceeded", severity: "medium", metadata: { bucket, limit } });
    return false;
  }
  return true;
}
function safeConversation(c: Record<string,unknown>) {
  return {
    id: c.id, subject: c.subject, status: c.status, clientName: c.client_name ?? null,
    clientEmail: c.client_email ?? null, createdAt: c.created_at, updatedAt: c.updated_at,
    lastClientMessageAt: c.last_client_message_at ?? null,
    lastOwnerMessageAt: c.last_owner_message_at ?? null,
    clientUserId: c.client_user_id ?? null,
  };
}
async function loadMessages(admin: ReturnType<typeof createClient>, conversationId: string, before?: string, limit = 50) {
  let query = admin.from("client_messages")
    .select("id,conversation_id,sender_type,sender_user_id,body,idempotency_key,message_status,read_at,attachment_metadata,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit,1),50));
  if (before && !Number.isNaN(Date.parse(before))) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw new Error("Could not load conversation messages.");
  return (data ?? []).reverse();
}
async function getConversation(admin: ReturnType<typeof createClient>, id: string) {
  const { data, error } = await admin.from("client_conversations").select("*").eq("id",id).maybeSingle();
  if (error) throw new Error("Could not load this conversation.");
  return data;
}
async function markRead(admin: ReturnType<typeof createClient>, conversationId: string, reader: "client"|"owner") {
  const senders = reader === "client" ? ["owner","ai","system"] : ["client"];
  const { error } = await admin.from("client_messages").update({ read_at: new Date().toISOString(), message_status: "read" })
    .eq("conversation_id",conversationId).in("sender_type",senders).is("read_at",null);
  if (error) throw new Error("Could not update message read status.");
}
async function requireClientConversation(admin: ReturnType<typeof createClient>, conversationId: string, userId: string, req: Request) {
  const conversation = await getConversation(admin,conversationId);
  if (!conversation || conversation.client_user_id !== userId) {
    await writeSecurityEvent(admin,req,{actorUserId:userId,eventType:"conversation_access_denied",severity:"high",metadata:{conversationId}});
    return null;
  }
  return conversation;
}
async function makeAiReply(req: Request, userToken: string, publishable: string, messages: Array<{role:"user"|"assistant";content:string}>, agent: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return null;

  const expectedUrl = new URL("/functions/v1/apex-ai-gateway", supabaseUrl);
  const configuredUrl = Deno.env.get("APEX_AI_GATEWAY_URL")?.trim();
  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      if (parsed.origin !== expectedUrl.origin || parsed.pathname !== expectedUrl.pathname ||
          parsed.search !== "" || parsed.hash !== "" || parsed.username !== "" || parsed.password !== "") {
        console.error("APEX AI gateway URL configuration rejected");
        return null;
      }
    } catch {
      console.error("APEX AI gateway URL configuration rejected");
      return null;
    }
  }
  const url = expectedUrl.toString();
  const origin = req.headers.get("origin") ?? SITE_ORIGIN;
  const response = await fetch(url,{
    method:"POST",
    redirect:"error",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${userToken}`,
      "apikey":publishable,
      "Origin":origin,
    },
    body:JSON.stringify({agent,messages,temperature:0.4,maxOutputTokens:600}),
    signal:AbortSignal.timeout(28000),
  });
  if (!response.ok) {
    console.error("APEX AI gateway failed", { status: response.status });
    return null;
  }
  let bodyText: string;
  try { bodyText = await readBoundedText(response.body, 512 * 1024, response.headers.get("content-length")); }
  catch { console.error("APEX AI gateway response rejected"); return null; }
  try {
    const data = JSON.parse(bodyText);
    return typeof data?.content === "string" && data.content.trim() && data.content.length <= 20000
      ? data.content.trim()
      : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers});
  if (req.method !== "POST") return respond({error:"Method not allowed"},405,headers);
  if (origin && headers["Access-Control-Allow-Origin"] === "null") return respond({error:"Origin not allowed"},403,headers);
  const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return respond({error:"Content-Type must be application/json"},415,headers);

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = Deno.env.get("SUPABASE_URL");
  const pubKey = clientKey();
  const adminKey = serverKey();
  if (!url || !pubKey || !adminKey || !token) return respond({error:"Please sign in again and retry."},401,headers);

  const userClient = createClient(url,pubKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authHeader}}});
  const {data:userData,error:userError} = await userClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return respond({error:"Your session is invalid. Please sign in again."},401,headers);
  const admin = createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ownerSettings,error:ownerSettingsError} = await admin.from("apex_owner_settings").select("owner_user_id").eq("id",true).maybeSingle();
  if (ownerSettingsError) return respond({error:"The chat service is temporarily unavailable."},503,headers);
  const isOwner = !!ownerSettings?.owner_user_id && ownerSettings.owner_user_id === user.id;

  let input: Record<string,unknown>;
  let rawBody: string;
  try {
    rawBody = await readBoundedText(req.body, 16 * 1024, req.headers.get("content-length"));
  } catch (error) {
    return respond({error:error instanceof BodyTooLargeError ? "Request too large" : "Invalid request body."}, error instanceof BodyTooLargeError ? 413 : 400, headers);
  }
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
    input = parsed as Record<string,unknown>;
  } catch { return respond({error:"Invalid JSON."},400,headers); }
  const action = clip(input.action,40);
  const conversationId = isUuid(input.conversationId) ? input.conversationId : null;
  const before = clip(input.before,60);
  if (input.conversationId && !conversationId) return respond({error:"Invalid conversation reference."},400,headers);

  try {
    if (action === "open") {
      if (conversationId) {
        const conversation = await requireClientConversation(admin,conversationId,user.id,req);
        if (!conversation) return respond({error:"This conversation was not found."},404,headers);
        await markRead(admin,conversationId,"client");
        return respond({conversation:safeConversation(conversation),messages:await loadMessages(admin,conversationId,before)},200,headers);
      }
      const allowed = await consumeRateLimit(admin,req,user.id,"conversation_open",30);
      if (!allowed) return respond({error:"Too many chat requests. Please wait a moment and try again."},429,headers);
      const ipSubject = await ipRateLimitSubject(req, adminKey);
      if (ipSubject) {
        const ipAllowed = await consumeRateLimit(admin,req,user.id,"conversation_open_ip",20,ipSubject);
        if (!ipAllowed) return respond({error:"Too many new chats from this network. Please try again later."},429,headers);
      }
      const ownerId = ownerSettings?.owner_user_id ?? null;
      const insert = await admin.from("client_conversations").insert({
        owner_user_id: ownerId,
        client_user_id: user.id,
        visitor_token_hash: ownerId ? null : await sha256(`apex-client-session:${user.id}`),
        client_name: null,
        client_email: user.email ?? null,
        subject: clip(input.subject,120) || "Website chat",
        status:"open",
      }).select("*").single();
      if (insert.error || !insert.data) {
        console.error("APEX conversation create failed",insert.error?.code ?? "unknown");
        return respond({error:"Could not start the chat. Please try again."},500,headers);
      }
      await writeAudit(admin,user.id,"conversation_created","conversation",insert.data.id,{source:"website"});
      return respond({conversation:safeConversation(insert.data),messages:[]},201,headers);
    }

    if (action === "history" || action === "client_read") {
      if (!conversationId) return respond({error:"Conversation reference is required."},400,headers);
      const conversation = await requireClientConversation(admin,conversationId,user.id,req);
      if (!conversation) return respond({error:"This conversation was not found."},404,headers);
      const allowed = await consumeRateLimit(admin,req,user.id,"client_chat_history",60);
      if (!allowed) return respond({error:"Too many history requests. Please wait a moment."},429,headers);
      if (action === "client_read") await markRead(admin,conversationId,"client");
      const messages = await loadMessages(admin,conversationId,before);
      return respond({conversation:safeConversation(conversation),messages},200,headers);
    }

    if (action === "send") {
      if (!conversationId) return respond({error:"Conversation reference is required."},400,headers);
      const body = clip(input.body,8000);
      const idempotencyKey = clip(input.idempotencyKey,100);
      if (body.length < 1 || typeof input.body !== "string" || input.body.length > 8000) return respond({error:"Message must contain between 1 and 8000 characters."},400,headers);
      if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(idempotencyKey)) return respond({error:"Invalid message request key."},400,headers);
      const conversation = await requireClientConversation(admin,conversationId,user.id,req);
      if (!conversation) return respond({error:"This conversation was not found."},404,headers);
      if (conversation.status === "closed") return respond({error:"This conversation is closed. Please start a new chat."},409,headers);
      const existing = await admin.from("client_messages").select("id,conversation_id,sender_type,sender_user_id,body,message_status,read_at,attachment_metadata,created_at").eq("conversation_id",conversationId).eq("idempotency_key",idempotencyKey).maybeSingle();
      if (existing.data) return respond({conversation:safeConversation(conversation),messages:[existing.data],duplicate:true},200,headers);
      const allowed = await consumeRateLimit(admin,req,user.id,"client_chat_send",10);
      if (!allowed) return respond({error:"You've sent several messages in a short time. Please wait a minute."},429,headers);
      const ipSubject = await ipRateLimitSubject(req, adminKey);
      if (ipSubject) {
        const ipAllowed = await consumeRateLimit(admin,req,user.id,"client_chat_send_ip",30,ipSubject);
        if (!ipAllowed) return respond({error:"Too many messages from this network. Please wait a minute."},429,headers);
      }

      const {data:clientMessage,error:insertError} = await admin.from("client_messages").insert({
        conversation_id:conversationId,sender_type:"client",sender_user_id:user.id,body,
        idempotency_key:idempotencyKey,message_status:"sent",attachment_metadata:[],
      }).select("id,conversation_id,sender_type,sender_user_id,body,message_status,read_at,attachment_metadata,created_at").single();
      if (insertError || !clientMessage) {
        console.error("APEX client message write failed",insertError?.code ?? "unknown");
        return respond({error:"Your message could not be saved. Please try again."},500,headers);
      }
      const now = new Date().toISOString();
      await admin.from("client_conversations").update({
        last_client_message_at:now,updated_at:now,status:"waiting_owner",
      }).eq("id",conversationId);
      await writeAudit(admin,user.id,"client_message_sent","conversation",conversationId,{messageId:clientMessage.id,bodyLength:body.length});

      const requestedAgent = clip(input.agent,40) || "support";
      const agent = new Set(["support","technical"]).has(requestedAgent) ? requestedAgent : "support";
      const history = await loadMessages(admin,conversationId,undefined,14);
      const historyCandidates = history
        .filter((m) => ["client","ai","owner"].includes(String(m.sender_type)))
        .map((m) => ({role: m.sender_type === "client" ? "user" as const : "assistant" as const,content:String(m.body).slice(-4000)}));
      // Keep only the newest context within the gateway's byte/character budget.
      const aiInput: Array<{role:"user"|"assistant";content:string}> = [];
      let aiInputChars = 0;
      for (const message of [...historyCandidates].reverse()) {
        if (aiInput.length >= 12 || aiInputChars + message.content.length > 24000) continue;
        aiInput.unshift(message);
        aiInputChars += message.content.length;
      }
      let aiText: string | null = null;
      try { aiText = await makeAiReply(req,token,pubKey,aiInput,agent); }
      catch (error) { console.error("APEX chat AI reply failed",error instanceof Error ? error.name : "unknown"); }
      if (!aiText) {
        await writeSecurityEvent(admin,req,{actorUserId:user.id,eventType:"chat_ai_unavailable",severity:"low",metadata:{conversationId}});
        const {data:current} = await getConversation(admin,conversationId).then(c=>({data:c}));
        return respond({conversation:safeConversation(current ?? conversation),messages:[clientMessage],aiUnavailable:true},200,headers);
      }
      const {data:aiMessage,error:aiInsertError} = await admin.from("client_messages").insert({
        conversation_id:conversationId,sender_type:"ai",sender_user_id:null,body:aiText,
        idempotency_key:`ai:${idempotencyKey}`,message_status:"sent",attachment_metadata:[],
      }).select("id,conversation_id,sender_type,sender_user_id,body,message_status,read_at,attachment_metadata,created_at").single();
      if (aiInsertError || !aiMessage) {
        console.error("APEX AI message write failed",aiInsertError?.code ?? "unknown");
        await writeSecurityEvent(admin,req,{actorUserId:user.id,eventType:"chat_ai_reply_not_persisted",severity:"medium",metadata:{conversationId}});
        return respond({conversation:safeConversation(conversation),messages:[clientMessage],aiUnavailable:true},200,headers);
      }
      await admin.from("client_conversations").update({status:"ai_handled",updated_at:new Date().toISOString()}).eq("id",conversationId);
      await writeAudit(admin,user.id,"ai_message_created","conversation",conversationId,{messageId:aiMessage.id,actor:"ai"});
      const {data:updatedConversation} = await getConversation(admin,conversationId).then(c=>({data:c}));
      return respond({conversation:safeConversation(updatedConversation ?? conversation),messages:[clientMessage,aiMessage],aiUnavailable:false},200,headers);
    }

    if (action === "owner_list") {
      if (!isOwner) {
        await writeSecurityEvent(admin,req,{actorUserId:user.id,eventType:"owner_chat_access_denied",severity:"high",metadata:{action}});
        return respond({error:"Owner access is required."},403,headers);
      }
      const allowed = await consumeRateLimit(admin,req,user.id,"owner_chat_list",60);
      if (!allowed) return respond({error:"Too many admin refresh requests. Please wait a moment."},429,headers);
      const {data:rows,error} = await admin.from("client_conversations")
        .select("id,owner_user_id,client_user_id,client_name,client_email,subject,status,created_at,updated_at,last_client_message_at,last_owner_message_at")
        .order("updated_at",{ascending:false}).limit(100);
      if (error) return respond({error:"Could not load conversations."},500,headers);
      const ids = (rows ?? []).map((x) => x.id);
      let latestMessages: Array<Record<string,unknown>> = [];
      let unreadMessages: Array<Record<string,unknown>> = [];
      if (ids.length) {
        const [recent,unread] = await Promise.all([
          admin.from("client_messages").select("id,conversation_id,sender_type,body,created_at").in("conversation_id",ids).order("created_at",{ascending:false}).limit(500),
          admin.from("client_messages").select("conversation_id").in("conversation_id",ids).eq("sender_type","client").is("read_at",null).limit(2000),
        ]);
        latestMessages = recent.data ?? [];
        unreadMessages = unread.data ?? [];
      }
      const latestByConversation: Record<string,Record<string,unknown>> = {};
      for (const message of latestMessages) if (!latestByConversation[String(message.conversation_id)]) latestByConversation[String(message.conversation_id)] = message;
      const unreadCount: Record<string,number> = {};
      for (const message of unreadMessages) unreadCount[String(message.conversation_id)] = (unreadCount[String(message.conversation_id)] ?? 0)+1;
      const conversations = (rows ?? []).map((r) => ({
        ...safeConversation(r as Record<string,unknown>),
        lastMessage: latestByConversation[String(r.id)] ? {
          body: String(latestByConversation[String(r.id)].body).slice(0,180),
          senderType: latestByConversation[String(r.id)].sender_type,
          createdAt: latestByConversation[String(r.id)].created_at,
        } : null,
        unreadCount: unreadCount[String(r.id)] ?? 0,
      }));
      const [securityResult,auditResult] = await Promise.all([
        admin.from("security_events").select("id,actor_user_id,event_type,severity,endpoint,request_id,origin,user_agent,metadata,created_at").order("created_at",{ascending:false}).limit(100),
        admin.from("audit_logs").select("id,actor_user_id,action,target_type,target_id,metadata,created_at").order("created_at",{ascending:false}).limit(100),
      ]);
      if (securityResult.error || auditResult.error) console.error("APEX admin audit data read failed",securityResult.error?.code ?? auditResult.error?.code);
      return respond({conversations,securityEvents:securityResult.data ?? [],auditLogs:auditResult.data ?? []},200,headers);
    }

    if (action === "owner_history" || action === "owner_read") {
      if (!isOwner) return respond({error:"Owner access is required."},403,headers);
      if (!conversationId) return respond({error:"Conversation reference is required."},400,headers);
      const allowed = await consumeRateLimit(admin,req,user.id,"owner_chat_history",60);
      if (!allowed) return respond({error:"Too many conversation history requests. Please wait."},429,headers);
      const conversation = await getConversation(admin,conversationId);
      if (!conversation) return respond({error:"Conversation not found."},404,headers);
      if (action === "owner_read") await markRead(admin,conversationId,"owner");
      const messages = await loadMessages(admin,conversationId,before);
      return respond({conversation:safeConversation(conversation),messages},200,headers);
    }

    if (action === "owner_send") {
      if (!isOwner) {
        await writeSecurityEvent(admin,req,{actorUserId:user.id,eventType:"owner_chat_access_denied",severity:"high",metadata:{action}});
        return respond({error:"Owner access is required."},403,headers);
      }
      if (!conversationId) return respond({error:"Conversation reference is required."},400,headers);
      const body = clip(input.body,8000);
      const idempotencyKey = clip(input.idempotencyKey,100);
      if (body.length < 1 || typeof input.body !== "string" || input.body.length > 8000) return respond({error:"Message must contain between 1 and 8000 characters."},400,headers);
      if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(idempotencyKey)) return respond({error:"Invalid message request key."},400,headers);
      const conversation = await getConversation(admin,conversationId);
      if (!conversation) return respond({error:"Conversation not found."},404,headers);
      const duplicate = await admin.from("client_messages").select("id,conversation_id,sender_type,sender_user_id,body,message_status,read_at,attachment_metadata,created_at").eq("conversation_id",conversationId).eq("idempotency_key",idempotencyKey).maybeSingle();
      if (duplicate.data) return respond({conversation:safeConversation(conversation),messages:[duplicate.data],duplicate:true},200,headers);
      const allowed = await consumeRateLimit(admin,req,user.id,"owner_chat_send",30);
      if (!allowed) return respond({error:"Too many replies in a short time. Please wait a minute."},429,headers);
      const {data:message,error} = await admin.from("client_messages").insert({
        conversation_id:conversationId,sender_type:"owner",sender_user_id:user.id,body,
        idempotency_key:idempotencyKey,message_status:"sent",attachment_metadata:[],
      }).select("id,conversation_id,sender_type,sender_user_id,body,message_status,read_at,attachment_metadata,created_at").single();
      if (error || !message) return respond({error:"The reply could not be saved."},500,headers);
      const now = new Date().toISOString();
      const {error:updateError} = await admin.from("client_conversations").update({
        owner_user_id:user.id,last_owner_message_at:now,updated_at:now,status:"waiting_client",
      }).eq("id",conversationId);
      if (updateError) return respond({error:"The reply was saved but conversation status could not be updated."},500,headers);
      await writeAudit(admin,user.id,"owner_message_sent","conversation",conversationId,{messageId:message.id,bodyLength:body.length});
      return respond({conversation:safeConversation({...conversation,owner_user_id:user.id,status:"waiting_client",last_owner_message_at:now,updated_at:now}),messages:[message]},201,headers);
    }

    if (action === "owner_status") {
      if (!isOwner) return respond({error:"Owner access is required."},403,headers);
      if (!conversationId) return respond({error:"Conversation reference is required."},400,headers);
      const status = clip(input.status,40);
      if (!OWNER_STATUSES.has(status)) return respond({error:"Unsupported conversation status."},400,headers);
      const conversation = await getConversation(admin,conversationId);
      if (!conversation) return respond({error:"Conversation not found."},404,headers);
      const {error} = await admin.from("client_conversations").update({status,owner_user_id:user.id,updated_at:new Date().toISOString()}).eq("id",conversationId);
      if (error) return respond({error:"Could not update conversation status."},500,headers);
      await writeAudit(admin,user.id,"conversation_status_changed","conversation",conversationId,{from:conversation.status,to:status});
      return respond({ok:true,status},200,headers);
    }

    return respond({error:"Unsupported chat action."},400,headers);
  } catch (error) {
    console.error("APEX chat request failed",error instanceof Error ? error.name : "unknown");
    return respond({error:"The chat service is temporarily unavailable. Please try again."},500,headers);
  }
});
