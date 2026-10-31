import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.75.0";
import { correlationId, FlowRequestError } from "./flow-engine-contracts.ts";

export interface FlowContext {
  admin: SupabaseClient;
  user: User;
  requestId: string;
}

function getPublishableKey(): string | undefined {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) {
    try {
      return JSON.parse(raw).default as string | undefined;
    } catch {
      // Fail closed if the published key map is malformed.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY");
}

function getSecretKey(): string | undefined {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      return JSON.parse(raw).default as string | undefined;
    } catch {
      // Never fall back to a client key for privileged operations.
    }
  }
  return undefined;
}

export async function getFlowContext(request: Request): Promise<FlowContext> {
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  const secretKey = getSecretKey();
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!projectUrl || !publishableKey || !secretKey) {
    throw new FlowRequestError("not_configured", 503);
  }
  if (!token) throw new FlowRequestError("unauthorized", 401);

  const userClient = createClient(projectUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;

  if (userError || !user || !user.email_confirmed_at) {
    throw new FlowRequestError("unauthorized", 401);
  }

  const admin = createClient(projectUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ownerSettings, error: ownerError } = await admin
    .from("apex_owner_settings")
    .select("owner_user_id")
    .eq("id", true)
    .maybeSingle();

  if (ownerError) throw new FlowRequestError("internal_error", 500);
  if (!ownerSettings?.owner_user_id) throw new FlowRequestError("not_configured", 503);
  if (ownerSettings.owner_user_id !== user.id) {
    throw new FlowRequestError("forbidden", 403);
  }

  return { admin, user, requestId: correlationId() };
}
