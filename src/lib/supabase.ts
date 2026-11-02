import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://umjvcnzyslzspwwpjkvw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtanZjbnp5c2x6c3B3d3Bqa3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTk4ODIsImV4cCI6MjEwNzY3NTg4Mn0.4kpaOKkSB8x_gG8KihxoPRY7Ie21Jvu_pRY6azqqzhU';

function normalizeSupabaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('your-project-id')) return undefined;

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

const envUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);
const envAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
)?.trim();

export const activeSupabaseUrl = envUrl || DEFAULT_SUPABASE_URL;
const activeSupabaseAnonKey =
  envAnonKey && envAnonKey.length > 20 && !envAnonKey.includes('your-supabase-anon')
    ? envAnonKey
    : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase: SupabaseClient = createClient(
  activeSupabaseUrl,
  activeSupabaseAnonKey
);
