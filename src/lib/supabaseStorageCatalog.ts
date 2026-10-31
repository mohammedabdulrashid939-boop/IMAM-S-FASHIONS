import { supabase } from './supabase.ts';
import { FashionStyleItem } from '../constants/brand.ts';

const CATALOG_BUCKET = 'fashion-styles';
const CATALOG_FILE = '_catalog_styles.json';

export const SUPABASE_QUICK_FIX_SQL = `-- 1. Create the tables if they do not exist yet
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone_number TEXT DEFAULT '',
  password_hash TEXT,
  account_status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  uid TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '',
  account_status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  uid TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fashion_styles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('men', 'women')),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Disable RLS so all phones & visitors can view styles and Admin can upload freely
ALTER TABLE public.fashion_styles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to Supabase API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Ensure public storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-styles', 'fashion-styles', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS "Allow all fashion-styles bucket operations" ON storage.objects;
CREATE POLICY "Allow all fashion-styles bucket operations"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'fashion-styles')
  WITH CHECK (bucket_id = 'fashion-styles');

-- 5. Force Supabase API schema cache reload
COMMENT ON TABLE public.fashion_styles IS 'IMAM FASHION STYLES CATALOG';
NOTIFY pgrst, 'reload schema';`;

export async function loadCatalogFromSupabaseStorage(): Promise<FashionStyleItem[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.storage
      .from(CATALOG_BUCKET)
      .download(CATALOG_FILE);
    if (error || !data) return [];
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCatalogToSupabaseStorage(items: FashionStyleItem[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
    const { error } = await supabase.storage
      .from(CATALOG_BUCKET)
      .upload(CATALOG_FILE, blob, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
    return !error;
  } catch {
    return false;
  }
}

export async function appendStyleToSupabaseStorageCatalog(
  item: Omit<FashionStyleItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FashionStyleItem | null> {
  const existing = await loadCatalogFromSupabaseStorage();
  const now = new Date().toISOString();
  const nextId =
    existing.reduce((max, s) => (s.id > max ? s.id : max), 0) + 1;
  const created: FashionStyleItem = {
    id: nextId,
    title: item.title,
    description: item.description,
    category: item.category,
    imageUrl: item.imageUrl,
    storagePath: item.storagePath,
    isPublished: item.isPublished,
    createdAt: now,
    updatedAt: now,
  };
  const updated = [created, ...existing];
  const ok = await saveCatalogToSupabaseStorage(updated);
  return ok ? created : null;
}

export async function updateStyleInSupabaseStorageCatalog(
  id: number,
  updates: Partial<FashionStyleItem>
): Promise<boolean> {
  const existing = await loadCatalogFromSupabaseStorage();
  const idx = existing.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  existing[idx] = {
    ...existing[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return saveCatalogToSupabaseStorage(existing);
}

export async function deleteStyleFromSupabaseStorageCatalog(id: number): Promise<boolean> {
  const existing = await loadCatalogFromSupabaseStorage();
  const filtered = existing.filter((s) => s.id !== id);
  return saveCatalogToSupabaseStorage(filtered);
}
