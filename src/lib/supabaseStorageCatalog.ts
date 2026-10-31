import { supabase } from './supabase.ts';
import { FashionStyleItem } from '../constants/brand.ts';

const CATALOG_BUCKET = 'fashion-styles';
const CATALOG_FILE = '_catalog_styles.json';
export const STYLE_UID_PREFIX = 'fashion_style__';

export const SUPABASE_QUICK_FIX_SQL = `CREATE TABLE IF NOT EXISTS public.fashion_styles (
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

ALTER TABLE public.fashion_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to fashion_styles" ON public.fashion_styles;
CREATE POLICY "Public full access to fashion_styles"
  ON public.fashion_styles
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

COMMENT ON TABLE public.fashion_styles IS 'IMAM FASHION STYLES CATALOG';
NOTIFY pgrst, 'reload schema';`;

function parseProfileRowAsStyle(row: any): FashionStyleItem | null {
  try {
    if (!row || !String(row.uid || '').startsWith(STYLE_UID_PREFIX)) return null;
    const parsed = JSON.parse(row.full_name);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      id: Number(row.id),
      title: String(parsed.title || ''),
      description: String(parsed.description || ''),
      category: parsed.category === 'women' ? 'women' : 'men',
      imageUrl: String(parsed.imageUrl || ''),
      storagePath: String(parsed.storagePath || ''),
      isPublished: parsed.isPublished !== false,
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(parsed.updatedAt || row.created_at || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export async function loadCatalogFromSupabaseStorage(): Promise<FashionStyleItem[]> {
  if (!supabase) return [];

  // 1. Primary fallback: read style records stored in the existing 'profiles' table
  try {
    const { data: profileRows, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .like('uid', `${STYLE_UID_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (!profErr && Array.isArray(profileRows) && profileRows.length > 0) {
      const styles = profileRows
        .map(parseProfileRowAsStyle)
        .filter((s): s is FashionStyleItem => s !== null);
      if (styles.length > 0) {
        return styles;
      }
    }
  } catch {
    // Continue to storage fallback
  }

  // 2. Secondary fallback: read from Supabase Storage bucket if present
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

export async function appendStyleToSupabaseStorageCatalog(
  item: Omit<FashionStyleItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FashionStyleItem | null> {
  if (!supabase) return null;
  const now = new Date().toISOString();

  // 1. Store inside 'profiles' table (which is guaranteed to exist & be in schema cache)
  try {
    const uid = `${STYLE_UID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = JSON.stringify({
      __type: 'FASHION_STYLE',
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
      storagePath: item.storagePath,
      isPublished: item.isPublished,
      updatedAt: now,
    });

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        uid,
        full_name: payload,
        email: 'style@imamsfashion.local',
        phone_number: item.category,
        account_status: 'Active',
      })
      .select()
      .single();

    if (!error && data) {
      const parsed = parseProfileRowAsStyle(data);
      if (parsed) return parsed;
    }
  } catch {
    // Fall through to storage bucket backup
  }

  // 2. Secondary backup in Storage bucket
  try {
    const existing = await loadCatalogFromSupabaseStorage();
    const nextId = existing.reduce((max, s) => (s.id > max ? s.id : max), 0) + 1;
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
    const blob = new Blob([JSON.stringify(updated)], { type: 'application/json' });
    const { error } = await supabase.storage
      .from(CATALOG_BUCKET)
      .upload(CATALOG_FILE, blob, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
    return !error ? created : null;
  } catch {
    return null;
  }
}

export async function updateStyleInSupabaseStorageCatalog(
  id: number,
  updates: Partial<FashionStyleItem>
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: existingRow, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .like('uid', `${STYLE_UID_PREFIX}%`)
      .maybeSingle();

    if (!fetchErr && existingRow) {
      const current = parseProfileRowAsStyle(existingRow);
      if (current) {
        const merged: FashionStyleItem = {
          ...current,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        const payload = JSON.stringify({
          __type: 'FASHION_STYLE',
          title: merged.title,
          description: merged.description,
          category: merged.category,
          imageUrl: merged.imageUrl,
          storagePath: merged.storagePath,
          isPublished: merged.isPublished,
          updatedAt: merged.updatedAt,
        });
        const { error: upErr } = await supabase
          .from('profiles')
          .update({
            full_name: payload,
            phone_number: merged.category,
          })
          .eq('id', id);
        if (!upErr) return true;
      }
    }
  } catch {
    // Ignore
  }
  return false;
}

export async function deleteStyleFromSupabaseStorageCatalog(id: number): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .like('uid', `${STYLE_UID_PREFIX}%`);
    if (!error) return true;
  } catch {
    // Ignore
  }
  return false;
}
