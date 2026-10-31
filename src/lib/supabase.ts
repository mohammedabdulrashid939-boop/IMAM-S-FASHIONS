import { createClient, SupabaseClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // 1. Convert https://<project-ref>.storage.supabase.co/... -> https://<project-ref>.supabase.co
  const storageSubdomainMatch = trimmed.match(
    /https?:\/\/([a-z0-9-]+)\.storage\.supabase\.co/i
  );
  if (storageSubdomainMatch && storageSubdomainMatch[1]) {
    return `https://${storageSubdomainMatch[1]}.supabase.co`;
  }

  // 2. Convert https://supabase.com/dashboard/project/<project-ref>... -> https://<project-ref>.supabase.co
  const dashboardMatch = trimmed.match(
    /supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i
  );
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // 3. Strip any trailing path (such as /storage/v1/s3 or /rest/v1) so only https://<project-ref>.supabase.co remains
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

const supabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
)?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
