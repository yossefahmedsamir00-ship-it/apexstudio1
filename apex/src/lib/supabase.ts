import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase is not configured.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export async function ensureAnonymousSession(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`Supabase session error: ${sessionError.message}`);
  if (sessionData.session?.access_token) return sessionData.session.access_token;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? 'Supabase could not create an anonymous session.');
  }
  return data.session.access_token;
}
