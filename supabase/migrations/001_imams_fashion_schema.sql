-- ============================================================================
-- IMAM'S FASHION — COMPLETE SUPABASE SQL & SCHEMA CACHE FIX
-- Copy and run this in the Supabase SQL Editor to create all tables,
-- disable RLS restrictions, and reload the Supabase schema cache.
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

-- 2. DISABLE ROW LEVEL SECURITY SO UPLOADS & PHONE VIEWING NEVER GET BLOCKED
ALTER TABLE public.fashion_styles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 3. GRANT FULL TABLE & SEQUENCE PERMISSIONS TO SUPABASE API ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. STORAGE BUCKET ('fashion-styles') & STORAGE POLICIES
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

-- 5. FORCE SUPABASE POSTGREST SCHEMA CACHE RELOAD
COMMENT ON TABLE public.fashion_styles IS 'IMAM FASHION STYLES CATALOG';
NOTIFY pgrst, 'reload schema';
