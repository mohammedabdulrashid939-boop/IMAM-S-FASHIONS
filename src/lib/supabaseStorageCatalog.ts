import { supabase } from './supabase.ts';
import { FashionStyleItem, UserProfileRecord, FOUNDER_NAME } from '../constants/brand.ts';

const PRODUCT_IMAGES_BUCKET = 'product-images';
const FASHION_STYLES_BUCKET = 'fashion-styles';
const LOCAL_STORAGE_KEY = 'imams_fashion_styles_catalog_v2';
const LOCAL_USERS_KEY = 'imams_fashion_users_catalog_v2';
export const STYLE_UID_PREFIX = 'fashion_style__';
const FOUNDER_EMAIL = 'mohammedabdulrashid939@gmail.com';

export const SUPABASE_QUICK_FIX_SQL = `-- IMAM'S FASHION SUPABASE SCHEMA & RLS POLICIES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  uid TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone_number TEXT NOT NULL DEFAULT '',
  account_status TEXT NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Suspended')),
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published fashion_styles" ON public.fashion_styles;
CREATE POLICY "Public read published fashion_styles"
  ON public.fashion_styles
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated manage fashion_styles" ON public.fashion_styles;
CREATE POLICY "Authenticated manage fashion_styles"
  ON public.fashion_styles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';`;

interface EncodedStyleMeta {
  t: string; // title
  d: string; // description
  p: number; // 1 = published, 0 = unpublished
}

interface EncodedUserMeta {
  uid: string;
  n: string; // fullName
  e: string; // email
  ph: string; // phoneNumber
  s: 'Active' | 'Suspended';
  r: 'admin' | 'customer';
  c: string; // createdAt ISO
}

function encodeBase64Url(json: string): string {
  try {
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

function decodeBase64Url<T>(slug: string): T | null {
  try {
    const b64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function encodeMetaToSlug(meta: EncodedStyleMeta): string {
  return (
    encodeBase64Url(
      JSON.stringify({
        t: meta.t.trim().slice(0, 60),
        d: meta.d.trim().slice(0, 120),
        p: meta.p ? 1 : 0,
      })
    ) || 'style'
  );
}

function decodeSlugToMeta(slug: string): EncodedStyleMeta | null {
  const parsed = decodeBase64Url<any>(slug);
  if (!parsed || typeof parsed.t !== 'string') return null;
  return {
    t: parsed.t,
    d: typeof parsed.d === 'string' ? parsed.d : '',
    p: parsed.p === 0 ? 0 : 1,
  };
}

export function dataUrlToBlob(dataUrl: string, fallbackMime = 'image/jpeg'): Blob {
  const parts = dataUrl.split(',');
  const byteString = atob(parts[1] || '');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : fallbackMime;
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

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

function mergeStyleLists(...lists: FashionStyleItem[][]): FashionStyleItem[] {
  const seen = new Map<string, FashionStyleItem>();
  for (const list of lists) {
    for (const item of list) {
      if (!item || !item.title) continue;
      const key = `${item.id}-${item.category}`;
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
  const fromFashionStylesTable: FashionStyleItem[] = [];
  const fromProductImagesBucket: FashionStyleItem[] = [];
  const fromProductsTable: FashionStyleItem[] = [];
  const fromLocal = readLocalCatalog();

  // 1. Query 'fashion_styles' table if present
  try {
    const { data: fsRows, error: fsErr } = await supabase
      .from('fashion_styles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!fsErr && Array.isArray(fsRows)) {
      for (const row of fsRows) {
        fromFashionStylesTable.push({
          id: Number(row.id),
          title: String(row.title || ''),
          description: String(row.description || ''),
          category: row.category === 'women' ? 'women' : 'men',
          imageUrl: String(row.image_url || ''),
          storagePath: String(row.storage_path || ''),
          isPublished: row.is_published !== false,
          createdAt: String(row.created_at || new Date().toISOString()),
          updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
        });
      }
    }
  } catch {
    // Ignore if fashion_styles table is not present
  }

  // 2. Load from 'product-images' bucket (jerseys -> men, paints -> women)
  try {
    const [menRes, womenRes] = await Promise.all([
      supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .list('jerseys', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }),
      supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .list('paints', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }),
    ]);

    const parseBucketFiles = (
      files: any[] | null,
      folder: 'jerseys' | 'paints',
      category: 'men' | 'women',
      prefix: string
    ) => {
      if (!Array.isArray(files)) return;
      for (const file of files) {
        const name = String(file?.name || '');
        if (!name.startsWith(prefix)) continue;
        // Format: imam_men_<ts>_<slug>.jpg
        const withoutPrefix = name.slice(prefix.length).replace(/\.(jpg|jpeg|png|webp)$/i, '');
        const firstUnderscore = withoutPrefix.indexOf('_');
        if (firstUnderscore === -1) continue;
        const tsStr = withoutPrefix.slice(0, firstUnderscore);
        const slug = withoutPrefix.slice(firstUnderscore + 1);
        const tsNum = Number(tsStr) || Date.now();
        const meta = decodeSlugToMeta(slug);
        if (!meta) continue;

        const objectPath = `${folder}/${name}`;
        const { data: pubData } = supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .getPublicUrl(objectPath);

        if (pubData?.publicUrl) {
          fromProductImagesBucket.push({
            id: tsNum,
            title: meta.t,
            description: meta.d,
            category,
            imageUrl: pubData.publicUrl,
            storagePath: `${PRODUCT_IMAGES_BUCKET}/${objectPath}`,
            isPublished: meta.p === 1,
            createdAt: file.created_at || new Date(tsNum).toISOString(),
            updatedAt: file.updated_at || file.created_at || new Date(tsNum).toISOString(),
          });
        }
      }
    };

    parseBucketFiles(menRes.data, 'jerseys', 'men', 'imam_men_');
    parseBucketFiles(womenRes.data, 'paints', 'women', 'imam_women_');
  } catch {
    // Ignore
  }

  // 3. Also load from 'public.products' table if any Imam's Fashion styles were stored there
  try {
    const { data: prodRows, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .in('season', ['imam_men', 'imam_women'])
      .order('created_at', { ascending: false });

    if (!prodErr && Array.isArray(prodRows)) {
      for (const row of prodRows) {
        const cat: 'men' | 'women' = row.season === 'imam_women' ? 'women' : 'men';
        const numericId =
          Number(String(row.slug || '').replace(/\D+/g, '').slice(-13)) ||
          new Date(row.created_at).getTime();
        fromProductsTable.push({
          id: numericId,
          title: String(row.name || ''),
          description: String(row.description || ''),
          category: cat,
          imageUrl: String(row.brand || ''),
          storagePath: String(row.slug || ''),
          isPublished: row.published !== false,
          createdAt: String(row.created_at || new Date().toISOString()),
          updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
        });
      }
    }
  } catch {
    // Ignore
  }

  const merged = mergeStyleLists(
    fromFashionStylesTable,
    fromProductImagesBucket,
    fromProductsTable,
    fromLocal
  );
  if (merged.length > 0) {
    writeLocalCatalog(merged);
  }
  return merged;
}

export async function appendStyleToSupabaseStorageCatalog(
  item: Omit<FashionStyleItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FashionStyleItem> {
  const ts = Date.now();
  const now = new Date(ts).toISOString();
  const folder = item.category === 'men' ? 'jerseys' : 'paints';
  const prefix = item.category === 'men' ? 'imam_men_' : 'imam_women_';
  const slug = encodeMetaToSlug({
    t: item.title,
    d: item.description,
    p: item.isPublished ? 1 : 0,
  });
  const fileName = `${prefix}${ts}_${slug}.jpg`;
  const objectPath = `${folder}/${fileName}`;

  let finalImageUrl = item.imageUrl;
  let finalStoragePath = `${PRODUCT_IMAGES_BUCKET}/${objectPath}`;

  // 1. Upload image file with encoded metadata into the public 'product-images' bucket
  try {
    if (item.imageUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(item.imageUrl, 'image/jpeg');
      const { error: upErr } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(objectPath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });

      if (!upErr) {
        const { data: pubData } = supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .getPublicUrl(objectPath);
        if (pubData?.publicUrl) {
          finalImageUrl = pubData.publicUrl;
        }
      } else {
        await supabase.storage
          .from(FASHION_STYLES_BUCKET)
          .upload(objectPath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });
      }
    }
  } catch {
    // Ignore storage error and keep compressed dataUrl
  }

  // 2. Also insert into 'public.fashion_styles' or 'public.products' if available
  try {
    await supabase.from('fashion_styles').insert({
      title: item.title.trim(),
      description: item.description.trim(),
      category: item.category,
      image_url: finalImageUrl,
      storage_path: finalStoragePath,
      is_published: item.isPublished,
    });
  } catch {
    // Optional table
  }

  try {
    await supabase.from('products').insert({
      name: item.title.trim(),
      slug: `imam-${item.category}-${ts}`,
      description: item.description.trim(),
      price: 0,
      category: folder,
      brand: finalImageUrl,
      season: `imam_${item.category}`,
      featured: true,
      published: item.isPublished,
    });
  } catch {
    // Optional table
  }

  const created: FashionStyleItem = {
    id: ts,
    title: item.title.trim(),
    description: item.description.trim(),
    category: item.category,
    imageUrl: finalImageUrl,
    storagePath: finalStoragePath,
    isPublished: item.isPublished,
    createdAt: now,
    updatedAt: now,
  };

  const existing = readLocalCatalog();
  writeLocalCatalog([created, ...existing]);
  return created;
}

export async function updateStyleInSupabaseStorageCatalog(
  id: number,
  updates: Partial<FashionStyleItem>
): Promise<boolean> {
  const existing = await loadCatalogFromSupabaseStorage();
  const target = existing.find((s) => s.id === id);
  if (!target) return false;

  const merged: FashionStyleItem = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // 1. Update in 'product-images' bucket with updated metadata filename
  try {
    const oldRelPath = target.storagePath.replace(/^product-images\//, '');
    const folder = merged.category === 'men' ? 'jerseys' : 'paints';
    const prefix = merged.category === 'men' ? 'imam_men_' : 'imam_women_';
    const slug = encodeMetaToSlug({
      t: merged.title,
      d: merged.description,
      p: merged.isPublished ? 1 : 0,
    });
    const newObjectPath = `${folder}/${prefix}${id}_${slug}.jpg`;

    let blob: Blob | null = null;
    if (merged.imageUrl.startsWith('data:')) {
      blob = dataUrlToBlob(merged.imageUrl, 'image/jpeg');
    } else if (merged.imageUrl.startsWith('http')) {
      const resp = await fetch(merged.imageUrl);
      if (resp.ok) {
        blob = await resp.blob();
      }
    }

    if (blob) {
      const { error: upErr } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(newObjectPath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });
      if (!upErr) {
        if (oldRelPath && oldRelPath !== newObjectPath) {
          await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([oldRelPath]);
        }
        const { data: pubData } = supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .getPublicUrl(newObjectPath);
        if (pubData?.publicUrl) {
          merged.imageUrl = pubData.publicUrl;
          merged.storagePath = `${PRODUCT_IMAGES_BUCKET}/${newObjectPath}`;
        }
      }
    }
  } catch {
    // Ignore
  }

  // 2. Also update in 'fashion_styles' / 'products' if present
  try {
    await supabase
      .from('fashion_styles')
      .update({
        title: merged.title,
        description: merged.description,
        category: merged.category,
        image_url: merged.imageUrl,
        storage_path: merged.storagePath,
        is_published: merged.isPublished,
        updated_at: merged.updatedAt,
      })
      .eq('id', id);
  } catch {
    // Ignore
  }

  try {
    await supabase
      .from('products')
      .update({
        name: merged.title,
        description: merged.description,
        category: merged.category === 'men' ? 'jerseys' : 'paints',
        brand: merged.imageUrl,
        season: `imam_${merged.category}`,
        published: merged.isPublished,
        updated_at: merged.updatedAt,
      })
      .eq('slug', `imam-${target.category}-${id}`);
  } catch {
    // Ignore
  }

  const updatedList = existing.map((s) => (s.id === id ? merged : s));
  writeLocalCatalog(updatedList);
  return true;
}

export async function deleteStyleFromSupabaseStorageCatalog(id: number): Promise<boolean> {
  const existing = await loadCatalogFromSupabaseStorage();
  const target = existing.find((s) => s.id === id);

  if (target) {
    try {
      if (target.storagePath.startsWith('product-images/')) {
        const rel = target.storagePath.replace(/^product-images\//, '');
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([rel]);
      } else if (target.storagePath.startsWith('fashion-styles/')) {
        const rel = target.storagePath.replace(/^fashion-styles\//, '');
        await supabase.storage.from(FASHION_STYLES_BUCKET).remove([rel]);
      }
    } catch {
      // Ignore
    }
    try {
      await supabase.from('fashion_styles').delete().eq('id', id);
    } catch {
      // Ignore
    }
    try {
      await supabase
        .from('products')
        .delete()
        .eq('slug', `imam-${target.category}-${id}`);
    } catch {
      // Ignore
    }
  }

  const filtered = existing.filter((s) => s.id !== id);
  writeLocalCatalog(filtered);
  return true;
}

// ============================================================================
// SUPABASE USER PROFILE & ROLE SYNC HELPERS
// ============================================================================

function readLocalUsers(): UserProfileRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: UserProfileRecord[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore
  }
}

export async function syncUserProfileToSupabase(
  userRecord: UserProfileRecord
): Promise<UserProfileRecord> {
  const cleanEmail = userRecord.email.trim().toLowerCase();
  const isFounder = cleanEmail === FOUNDER_EMAIL || userRecord.role === 'admin';
  const finalRole: 'admin' | 'customer' = isFounder ? 'admin' : 'customer';
  const normalized: UserProfileRecord = {
    ...userRecord,
    email: cleanEmail,
    role: finalRole,
    accountStatus: userRecord.accountStatus || 'Active',
  };

  // 1. Upsert into public.profiles(uid, ...) and public.user_roles(uid, role)
  try {
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('*')
      .eq('uid', normalized.uid)
      .maybeSingle();

    if (existingProf?.account_status === 'Suspended' && !isFounder) {
      normalized.accountStatus = 'Suspended';
    }

    await supabase.from('profiles').upsert(
      {
        uid: normalized.uid,
        full_name: normalized.fullName,
        email: normalized.email,
        phone_number: normalized.phoneNumber,
        account_status: normalized.accountStatus,
        role: finalRole,
      },
      { onConflict: 'uid' }
    );

    await supabase.from('user_roles').upsert(
      {
        uid: normalized.uid,
        role: finalRole,
      },
      { onConflict: 'uid' }
    );
  } catch {
    // Fallback if profiles uses id instead of uid
    try {
      await supabase
        .from('profiles')
        .update({ display_name: normalized.fullName })
        .eq('id', normalized.uid);
    } catch {
      // Ignore
    }
  }

  // 2. Sync user metadata entry in 'product-images/imam-users/'
  try {
    const { data: existingFiles } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .list('imam-users', { limit: 200 });

    const prefix = `usr_${normalized.uid}_`;
    const oldPaths: string[] = [];
    let existingStatus: 'Active' | 'Suspended' | null = null;

    if (Array.isArray(existingFiles)) {
      for (const f of existingFiles) {
        if (String(f.name || '').startsWith(prefix)) {
          oldPaths.push(`imam-users/${f.name}`);
          const slugPart = String(f.name)
            .slice(prefix.length)
            .replace(/\.(jpg|jpeg|png|webp)$/i, '');
          const decoded = decodeBase64Url<EncodedUserMeta>(slugPart);
          if (decoded?.s === 'Suspended') {
            existingStatus = 'Suspended';
          }
        }
      }
    }

    if (existingStatus === 'Suspended' && !isFounder) {
      normalized.accountStatus = 'Suspended';
    }

    const encoded = encodeBase64Url(
      JSON.stringify({
        uid: normalized.uid,
        n: normalized.fullName,
        e: normalized.email,
        ph: normalized.phoneNumber,
        s: normalized.accountStatus === 'Suspended' ? 'Suspended' : 'Active',
        r: normalized.role === 'admin' ? 'admin' : 'customer',
        c: normalized.createdAt || new Date().toISOString(),
      } satisfies EncodedUserMeta)
    );

    if (encoded) {
      const newPath = `imam-users/${prefix}${encoded}.jpg`;
      const tinyJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
        type: 'image/jpeg',
      });
      const { error: upErr } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(newPath, tinyJpeg, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!upErr) {
        const toDelete = oldPaths.filter((p) => p !== newPath);
        if (toDelete.length > 0) {
          await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(toDelete);
        }
      }
    }
  } catch {
    // Ignore
  }

  const localUsers = readLocalUsers().filter((u) => u.uid !== normalized.uid);
  writeLocalUsers([normalized, ...localUsers]);
  return normalized;
}

export async function loadUsersFromSupabase(
  sortOrder: 'newest' | 'oldest' = 'newest'
): Promise<UserProfileRecord[]> {
  const byUid = new Map<string, UserProfileRecord>();

  // 1. Load from 'product-images/imam-users'
  try {
    const { data: files } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .list('imam-users', { limit: 200 });

    if (Array.isArray(files)) {
      files.forEach((f, idx) => {
        const name = String(f.name || '');
        if (!name.startsWith('usr_')) return;
        const withoutUsr = name.slice(4).replace(/\.(jpg|jpeg|png|webp)$/i, '');
        const lastUnderscore = withoutUsr.lastIndexOf('_');
        if (lastUnderscore === -1) return;
        const slug = withoutUsr.slice(lastUnderscore + 1);
        const meta = decodeBase64Url<EncodedUserMeta>(slug);
        if (!meta || !meta.uid || meta.e === 'imam_migration_test@example.com') return;

        byUid.set(meta.uid, {
          id: idx + 1,
          uid: meta.uid,
          fullName: meta.n || (meta.r === 'admin' ? FOUNDER_NAME : 'Customer'),
          email: meta.e,
          phoneNumber: meta.ph || '',
          accountStatus: meta.s === 'Suspended' ? 'Suspended' : 'Active',
          createdAt: meta.c || f.created_at || new Date().toISOString(),
          role: meta.r === 'admin' || meta.e === FOUNDER_EMAIL ? 'admin' : 'customer',
        });
      });
    }
  } catch {
    // Ignore
  }

  // 2. Also merge rows from 'public.profiles'
  try {
    const { data: profRows } = await supabase.from('profiles').select('*');
    if (Array.isArray(profRows)) {
      profRows.forEach((p: any, idx: number) => {
        const uid = String(p.uid || p.id || '');
        if (!uid || uid.startsWith(STYLE_UID_PREFIX)) return;
        const displayName = String(p.full_name || p.display_name || '');
        if (displayName === 'imam_migration_test') return;
        if (!byUid.has(uid)) {
          const isRowAdmin = p.role === 'admin';
          byUid.set(uid, {
            id: typeof p.id === 'number' ? p.id : idx + 100,
            uid,
            fullName: displayName || (isRowAdmin ? FOUNDER_NAME : `Customer #${idx + 1}`),
            email: p.email || (isRowAdmin ? FOUNDER_EMAIL : `${displayName || 'customer'}@imamsfashion.com`),
            phoneNumber: p.phone_number || (isRowAdmin ? '0245198198' : ''),
            accountStatus: p.account_status === 'Suspended' ? 'Suspended' : 'Active',
            createdAt: p.created_at || new Date().toISOString(),
            role: isRowAdmin ? 'admin' : 'customer',
          });
        }
      });
    }
  } catch {
    // Ignore
  }

  for (const localUser of readLocalUsers()) {
    if (localUser.email === 'imam_migration_test@example.com') continue;
    if (!byUid.has(localUser.uid)) {
      byUid.set(localUser.uid, localUser);
    }
  }

  const list = Array.from(byUid.values());
  list.sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return sortOrder === 'oldest' ? -diff : diff;
  });
  return list;
}

export async function updateUserStatusInSupabase(
  userRecord: UserProfileRecord,
  nextStatus: 'Active' | 'Suspended'
): Promise<UserProfileRecord> {
  const updated: UserProfileRecord = {
    ...userRecord,
    accountStatus: nextStatus,
  };

  try {
    await supabase
      .from('profiles')
      .update({ account_status: nextStatus })
      .eq('uid', userRecord.uid);
  } catch {
    // Ignore
  }

  try {
    const { data: existingFiles } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .list('imam-users', { limit: 200 });

    const prefix = `usr_${userRecord.uid}_`;
    const oldPaths: string[] = [];
    if (Array.isArray(existingFiles)) {
      for (const f of existingFiles) {
        if (String(f.name || '').startsWith(prefix)) {
          oldPaths.push(`imam-users/${f.name}`);
        }
      }
    }

    const encoded = encodeBase64Url(
      JSON.stringify({
        uid: updated.uid,
        n: updated.fullName,
        e: updated.email,
        ph: updated.phoneNumber,
        s: updated.accountStatus === 'Suspended' ? 'Suspended' : 'Active',
        r: updated.role === 'admin' ? 'admin' : 'customer',
        c: updated.createdAt,
      } satisfies EncodedUserMeta)
    );

    if (encoded) {
      const newPath = `imam-users/${prefix}${encoded}.jpg`;
      const tinyJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
        type: 'image/jpeg',
      });
      const { error: upErr } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(newPath, tinyJpeg, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!upErr) {
        const toDelete = oldPaths.filter((p) => p !== newPath);
        if (toDelete.length > 0) {
          await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(toDelete);
        }
      }
    }
  } catch {
    // Ignore
  }

  const localUsers = readLocalUsers().map((u) => (u.uid === updated.uid ? updated : u));
  writeLocalUsers(localUsers);
  return updated;
}
