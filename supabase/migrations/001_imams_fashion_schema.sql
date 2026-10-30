-- ============================================================================
-- IMAM'S FASHION — COMPLETE SUPABASE SQL SETUP SCRIPT
-- Business: Imam's Fashion (Accra Zongo Lane, opposite K-F-M, Ghana)
-- Founder: Mohammed Abdul Rashid
-- Instructions: Copy and paste this entire script into the Supabase SQL Editor
-- and click "Run".
-- ============================================================================

-- 1. CREATE TABLES
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone_number TEXT DEFAULT '',
  password_hash TEXT,
  account_status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  uid TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '',
  account_status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  uid TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fashion_styles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('men', 'women')),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. HELPER FUNCTION TO VERIFY ADMIN ROLE
CREATE OR REPLACE FUNCTION public.is_admin_uid(check_uid TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE uid = check_uid AND role = 'admin'
  );
$$;

-- 3. AUTOMATIC TRIGGER FOR SUPABASE AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_user_id INTEGER;
  assigned_role TEXT;
BEGIN
  assigned_role := CASE
    WHEN lower(NEW.email) = 'mohammedabdulrashid939@gmail.com' THEN 'admin'
    ELSE 'customer'
  END;

  INSERT INTO public.users (uid, email, full_name, phone_number, account_status)
  VALUES (
    NEW.id::text,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    'Active'
  )
  ON CONFLICT (uid) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO inserted_user_id;

  INSERT INTO public.profiles (user_id, uid, full_name, email, phone_number, account_status)
  VALUES (
    inserted_user_id,
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    'Active'
  )
  ON CONFLICT (uid) DO NOTHING;

  INSERT INTO public.user_roles (user_id, uid, role)
  VALUES (inserted_user_id, NEW.id::text, assigned_role)
  ON CONFLICT (uid) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_supabase_user();

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_styles ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR FASHION_STYLES
DROP POLICY IF EXISTS "Public visitors can read published fashion styles" ON public.fashion_styles;
CREATE POLICY "Public visitors can read published fashion styles"
  ON public.fashion_styles
  FOR SELECT
  USING (is_published = TRUE OR public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Admins can insert fashion styles" ON public.fashion_styles;
CREATE POLICY "Admins can insert fashion styles"
  ON public.fashion_styles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Admins can update fashion styles" ON public.fashion_styles;
CREATE POLICY "Admins can update fashion styles"
  ON public.fashion_styles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_uid(auth.uid()::text))
  WITH CHECK (public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Admins can delete fashion styles" ON public.fashion_styles;
CREATE POLICY "Admins can delete fashion styles"
  ON public.fashion_styles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_uid(auth.uid()::text));

-- 6. RLS POLICIES FOR PROFILES & USERS
DROP POLICY IF EXISTS "Users view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users view own profile or admins view all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (uid = auth.uid()::text OR public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Users update own profile or admins update all" ON public.profiles;
CREATE POLICY "Users update own profile or admins update all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (uid = auth.uid()::text OR public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Users view own user record or admins view all" ON public.users;
CREATE POLICY "Users view own user record or admins view all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (uid = auth.uid()::text OR public.is_admin_uid(auth.uid()::text));

-- 7. RLS POLICIES FOR USER_ROLES
DROP POLICY IF EXISTS "Users view own role or admins view all" ON public.user_roles;
CREATE POLICY "Users view own role or admins view all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (uid = auth.uid()::text OR public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin_uid(auth.uid()::text))
  WITH CHECK (public.is_admin_uid(auth.uid()::text));

-- 8. CREATE STORAGE BUCKET: 'fashion-styles'
INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-styles', 'fashion-styles', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for fashion-styles bucket" ON storage.objects;
CREATE POLICY "Public read access for fashion-styles bucket"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'fashion-styles');

DROP POLICY IF EXISTS "Admins can upload to fashion-styles bucket" ON storage.objects;
CREATE POLICY "Admins can upload to fashion-styles bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fashion-styles' AND public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Admins can update fashion-styles bucket" ON storage.objects;
CREATE POLICY "Admins can update fashion-styles bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fashion-styles' AND public.is_admin_uid(auth.uid()::text));

DROP POLICY IF EXISTS "Admins can delete from fashion-styles bucket" ON storage.objects;
CREATE POLICY "Admins can delete from fashion-styles bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'fashion-styles' AND public.is_admin_uid(auth.uid()::text));
