-- ============================================================================
-- IMAM'S FASHION — SUPABASE POSTGRESQL SCHEMA, ROLES & ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- 1. PROFILES TABLE
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

-- 2. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. FASHION STYLES TABLE
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

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_styles ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR PROFILES
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;
CREATE POLICY "Users and admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- 6. RLS POLICIES FOR USER_ROLES
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.user_roles;
CREATE POLICY "Authenticated users can read roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. RLS POLICIES FOR FASHION_STYLES
DROP POLICY IF EXISTS "Public can view published fashion styles" ON public.fashion_styles;
CREATE POLICY "Public can view published fashion styles"
  ON public.fashion_styles
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated admins can manage fashion styles" ON public.fashion_styles;
CREATE POLICY "Authenticated admins can manage fashion styles"
  ON public.fashion_styles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. STORAGE BUCKET ('fashion-styles') & STORAGE RLS POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-styles', 'fashion-styles', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS "Public read fashion-styles objects" ON storage.objects;
CREATE POLICY "Public read fashion-styles objects"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('fashion-styles', 'product-images'));

DROP POLICY IF EXISTS "Authenticated manage fashion-styles objects" ON storage.objects;
CREATE POLICY "Authenticated manage fashion-styles objects"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id IN ('fashion-styles', 'product-images'))
  WITH CHECK (bucket_id IN ('fashion-styles', 'product-images'));

-- 9. GRANT ADMIN PRIVILEGES TO FOUNDER ACCOUNTS
INSERT INTO public.profiles (id, uid, full_name, display_name, email, phone_number, account_status, role)
SELECT
  u.id,
  u.id::text,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Mohammed Abdul Rashid'),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Mohammed Abdul Rashid'),
  LOWER(u.email),
  COALESCE(u.raw_user_meta_data->>'phone_number', '0245198198'),
  'Active',
  'admin'
FROM auth.users u
WHERE LOWER(u.email) IN ('mohammedabdulrashid@gmail.com', 'mohammedabdulrashid939@gmail.com')
ON CONFLICT (id) DO UPDATE SET
  uid = EXCLUDED.uid,
  email = EXCLUDED.email,
  role = 'admin',
  account_status = 'Active',
  updated_at = NOW();

INSERT INTO public.user_roles (uid, role)
SELECT u.id::text, 'admin'
FROM auth.users u
WHERE LOWER(u.email) IN ('mohammedabdulrashid@gmail.com', 'mohammedabdulrashid939@gmail.com')
ON CONFLICT (uid) DO UPDATE SET role = 'admin';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE LOWER(email) IN ('mohammedabdulrashid@gmail.com', 'mohammedabdulrashid939@gmail.com');

NOTIFY pgrst, 'reload schema';
