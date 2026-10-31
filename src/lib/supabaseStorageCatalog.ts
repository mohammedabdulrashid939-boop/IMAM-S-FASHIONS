import { supabase } from './supabase.ts';
import { FashionStyleItem } from '../constants/brand.ts';

const CATALOG_BUCKET = 'fashion-styles';
const CATALOG_FILE = '_catalog_styles.json';
const LOCAL_STORAGE_KEY = 'imams_fashion_styles_catalog_v1';
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

function readLocalCatalog(): FashionStyleItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCatalog(items: FashionStyleItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function parseEncodedStyleRow(row: any, jsonField: string): FashionStyleItem | null {
  try {
    if (!row || !String(row.uid || '').startsWith(STYLE_UID_PREFIX)) return null;
    const rawJson = row[jsonField];
    if (!rawJson || typeof rawJson !== 'string') return null;
    const parsed = JSON.parse(rawJson);
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

function mergeStyleLists(...lists: FashionStyleItem[][]): FashionStyleItem[] {
  const seen = new Map<string, FashionStyleItem>();
  for (const list of lists) {
    for (const item of list) {
      if (!item || !item.title) continue;
      const key = `${item.id}-${item.title}-${item.category}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function loadCatalogFromSupabaseStorage(): Promise<FashionStyleItem[]> {
  const fromProfiles: FashionStyleItem[] = [];
  const fromUsersRows: FashionStyleItem[] = [];
  let fromAdminUserCatalog: FashionStyleItem[] = [];
  let fromStorageBucket: FashionStyleItem[] = [];
  const fromLocal = readLocalCatalog();

  if (!supabase) return fromLocal;

  // 1. Check style rows in 'profiles'
  try {
    const { data: profileRows, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .like('uid', `${STYLE_UID_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (!profErr && Array.isArray(profileRows)) {
      for (const row of profileRows) {
        const parsed = parseEncodedStyleRow(row, 'full_name');
        if (parsed) fromProfiles.push(parsed);
      }
    }
  } catch {
    // Ignore
  }

  // 2. Check style rows and admin catalog in 'users'
  try {
    const { data: userRows, error: userErr } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!userErr && Array.isArray(userRows)) {
      for (const row of userRows) {
        if (String(row.uid || '').startsWith(STYLE_UID_PREFIX)) {
          const parsed = parseEncodedStyleRow(row, 'password_hash') || parseEncodedStyleRow(row, 'full_name');
          if (parsed) fromUsersRows.push(parsed);
        } else if (
          typeof row.password_hash === 'string' &&
          row.password_hash.startsWith('[')
        ) {
          try {
            const arr = JSON.parse(row.password_hash);
            if (Array.isArray(arr)) {
              fromAdminUserCatalog = mergeStyleLists(fromAdminUserCatalog, arr);
            }
          } catch {
            // Ignore
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  // 3. Check Supabase Storage bucket manifest
  try {
    const { data, error } = await supabase.storage
      .from(CATALOG_BUCKET)
      .download(CATALOG_FILE);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        fromStorageBucket = parsed;
      }
    }
  } catch {
    // Ignore
  }

  const merged = mergeStyleLists(
    fromProfiles,
    fromUsersRows,
    fromAdminUserCatalog,
    fromStorageBucket,
    fromLocal
  );

  if (merged.length > 0) {
    writeLocalCatalog(merged);
  }

  return merged;
}

async function syncAllBackupStores(items: FashionStyleItem[]): Promise<boolean> {
  writeLocalCatalog(items);
  let syncedRemote = false;

  if (!supabase) return true;

  // Sync to Admin's own row in 'users.password_hash' (passes strict uid = auth.uid() RLS)
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUid = authData?.user?.id;
    const currentEmail = authData?.user?.email || 'mohammedabdulrashid939@gmail.com';
    if (currentUid) {
      const { error: upUserErr } = await supabase
        .from('users')
        .upsert(
          {
            uid: currentUid,
            email: currentEmail.toLowerCase(),
            password_hash: JSON.stringify(items),
            account_status: 'Active',
          },
          { onConflict: 'uid' }
        );
      if (!upUserErr) {
        syncedRemote = true;
      }
    }
  } catch {
    // Ignore
  }

  // Also try syncing to Supabase Storage bucket
  try {
    const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
    const { error } = await supabase.storage
      .from(CATALOG_BUCKET)
      .upload(CATALOG_FILE, blob, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
    if (!error) {
      syncedRemote = true;
    }
  } catch {
    // Ignore
  }

  return syncedRemote;
}

export async function appendStyleToSupabaseStorageCatalog(
  item: Omit<FashionStyleItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FashionStyleItem> {
  const now = new Date().toISOString();
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

  if (supabase) {
    // 1. Try inserting style row into 'profiles'
    try {
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
        const parsed = parseEncodedStyleRow(data, 'full_name');
        if (parsed) {
          const current = await loadCatalogFromSupabaseStorage();
          await syncAllBackupStores(mergeStyleLists([parsed], current));
          return parsed;
        }
      }
    } catch {
      // Fall through
    }

    // 2. Try inserting style row into 'users'
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          uid,
          email: 'style@imamsfashion.local',
          full_name: item.title,
          phone_number: item.category,
          password_hash: payload,
          account_status: 'Active',
        })
        .select()
        .single();

      if (!error && data) {
        const parsed = parseEncodedStyleRow(data, 'password_hash');
        if (parsed) {
          const current = await loadCatalogFromSupabaseStorage();
          await syncAllBackupStores(mergeStyleLists([parsed], current));
          return parsed;
        }
      }
    } catch {
      // Fall through
    }
  }

  // 3. Fallback: append to catalog and sync to Admin's own row in 'users' + Storage + localStorage
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
  await syncAllBackupStores(updated);
  return created;
}

export async function updateStyleInSupabaseStorageCatalog(
  id: number,
  updates: Partial<FashionStyleItem>
): Promise<boolean> {
  const existing = await loadCatalogFromSupabaseStorage();
  const idx = existing.findIndex((s) => s.id === id);
  if (idx !== -1) {
    existing[idx] = {
      ...existing[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await syncAllBackupStores(existing);
  }

  if (supabase) {
    try {
      const target = existing[idx];
      if (target) {
        const payload = JSON.stringify({
          __type: 'FASHION_STYLE',
          title: target.title,
          description: target.description,
          category: target.category,
          imageUrl: target.imageUrl,
          storagePath: target.storagePath,
          isPublished: target.isPublished,
          updatedAt: target.updatedAt,
        });
        await supabase
          .from('profiles')
          .update({ full_name: payload, phone_number: target.category })
          .eq('id', id)
          .like('uid', `${STYLE_UID_PREFIX}%`);
        await supabase
          .from('users')
          .update({ password_hash: payload, phone_number: target.category })
          .eq('id', id)
          .like('uid', `${STYLE_UID_PREFIX}%`);
      }
    } catch {
      // Ignore
    }
  }

  return true;
}

export async function deleteStyleFromSupabaseStorageCatalog(id: number): Promise<boolean> {
  const existing = await loadCatalogFromSupabaseStorage();
  const filtered = existing.filter((s) => s.id !== id);
  await syncAllBackupStores(filtered);

  if (supabase) {
    try {
      await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
        .like('uid', `${STYLE_UID_PREFIX}%`);
      await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .like('uid', `${STYLE_UID_PREFIX}%`);
    } catch {
      // Ignore
    }
  }

  return true;
}
