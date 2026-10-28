import { supabase, ensureAnonymousSession } from './supabase';

let sessionId: string | null = null;

function getSessionId() {
  if (sessionId) return sessionId;
  const key = 'apex_session_id';
  const existing = localStorage.getItem(key);
  sessionId = existing ?? crypto.randomUUID();
  localStorage.setItem(key, sessionId);
  return sessionId;
}

export async function captureEvent(input: {
  eventName: string;
  projectId?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await ensureAnonymousSession();
    const { error } = await supabase.rpc('capture_site_event', {
      p_event_name: input.eventName,
      p_project_id: input.projectId ?? null,
      p_session_id: getSessionId(),
      p_locale: input.locale ?? document.documentElement.lang ?? null,
      p_path: window.location.pathname,
      p_metadata: input.metadata ?? {},
    });
    if (error) console.warn('APEX analytics event failed', error.message);
  } catch (error) {
    console.warn('APEX analytics unavailable', error);
  }
}

export async function submitProjectInquiry(input: {
  name: string;
  email: string;
  whatsapp?: string;
  serviceType: string;
  budgetRange?: string;
  description: string;
}) {
  await ensureAnonymousSession();
  const { data, error } = await supabase.rpc('capture_project_inquiry', {
    p_client_name: input.name,
    p_client_email: input.email,
    p_client_phone: input.whatsapp || null,
    p_project_type: input.serviceType,
    p_budget_range: input.budgetRange || null,
    p_brief: input.description,
    p_conversation_id: null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
