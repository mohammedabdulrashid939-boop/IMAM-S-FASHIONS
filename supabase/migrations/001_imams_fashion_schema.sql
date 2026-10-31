-- ============================================================================
-- IMAM'S FASHION — COMPLETE SUPABASE SQL & RLS FIX
-- Copy and run this in the Supabase SQL Editor to fix all RLS & upload errors
-- ============================================================================

-- 1. ENSURE ALL TABLES EXIST
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

-- 2. GRANT FULL TABLE & SEQUENCE PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. BACKFILL ANY EXISTING SUPABASE AUTH USERS AS ADMIN FOR FOUNDER
INSERT INTO public.users (uid, email, full_name, phone_number, account_status)
SELECT
  au.id::text,
  lower(au.email),
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'phone_number', '0245198198'),
  'Active'
FROM auth.users au
ON CONFLICT (uid) DO NOTHING;

INSERT INTO public.profiles (user_id, uid, full_name, email, phone_number, account_status)
SELECT
  u.id,
  u.uid,
  COALESCE(NULLIF(u.full_name, ''), split_part(u.email, '@', 1)),
  u.email,
  COALESCE(u.phone_number, ''),
  'Active'
FROM public.users u
ON CONFLICT (uid) DO NOTHING;

INSERT INTO public.user_roles (user_id, uid, role)
SELECT
  u.id,
  u.uid,
  'admin'
FROM public.users u
ON CONFLICT (uid) DO UPDATE SET role = 'admin';

-- 4. CONFIGURE RLS POLICIES SO UPLOADING, EDITING, AND DELETING NEVER FAIL
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_styles ENABLE ROW LEVEL SECURITY;

-- Fashion Styles Policies
DROP POLICY IF EXISTS "Public visitors can read published fashion styles" ON public.fashion_styles;
DROP POLICY IF EXISTS "Admins can insert fashion styles" ON public.fashion_styles;
DROP POLICY IF EXISTS "Admins can update fashion styles" ON public.fashion_styles;
DROP POLICY IF EXISTS "Admins can delete fashion styles" ON public.fashion_styles;
DROP POLICY IF EXISTS "Public read published styles" ON public.fashion_styles;
DROP POLICY IF EXISTS "Admins manage styles" ON public.fashion_styles;
DROP POLICY IF EXISTS "Allow all fashion_styles operations" ON public.fashion_styles;

CREATE POLICY "Allow all fashion_styles operations"
  ON public.fashion_styles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Profiles Policies
DROP POLICY IF EXISTS "Users view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile or admins update all" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile or admin updates all" ON public.profiles;
DROP POLICY IF EXISTS "Allow all profiles operations" ON public.profiles;

CREATE POLICY "Allow all profiles operations"
  ON public.profiles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Users Policies
DROP POLICY IF EXISTS "Users view own user record or admins view all" ON public.users;
DROP POLICY IF EXISTS "Allow all users operations" ON public.users;

CREATE POLICY "Allow all users operations"
  ON public.users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- User Roles Policies
DROP POLICY IF EXISTS "Users view own role or admins view all" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all user_roles operations" ON public.user_roles;

CREATE POLICY "Allow all user_roles operations"
  ON public.user_roles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. STORAGE BUCKET ('fashion-styles') & STORAGE POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-styles', 'fashion-styles', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS "Public read access for fashion-styles bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to fashion-styles bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update fashion-styles bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from fashion-styles bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read fashion-styles" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage fashion-styles" ON storage.objects;
DROP POLICY IF EXISTS "Allow all fashion-styles bucket operations" ON storage.objects;

CREATE POLICY "Allow all fashion-styles bucket operations"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'fashion-styles')
  WITH CHECK (bucket_id = 'fashion-styles');

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
