-- ============================================================================
-- IMAM'S FASHION — COMPLETE POSTGRESQL & SUPABASE RLS MIGRATION
-- Business: Imam's Fashion (Accra Zongo Lane, opposite K-F-M, Ghana)
-- Founder: Mohammed Abdul Rashid
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT DEFAULT '',
  account_status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. FASHION STYLES TABLE
CREATE TABLE IF NOT EXISTS public.fashion_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('men', 'women')),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to check administrator privileges securely on backend
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: FASHION STYLES
-- ============================================================================

-- Public visitors can read only published fashion styles
CREATE POLICY "Public visitors can view published fashion styles"
  ON public.fashion_styles
  FOR SELECT
  USING (is_published = TRUE OR public.is_admin(auth.uid()));

-- Only administrators can insert fashion styles
CREATE POLICY "Administrators can insert fashion styles"
  ON public.fashion_styles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Only administrators can update fashion styles
CREATE POLICY "Administrators can update fashion styles"
  ON public.fashion_styles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Only administrators can delete fashion styles
CREATE POLICY "Administrators can delete fashion styles"
  ON public.fashion_styles
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: PROFILES
-- ============================================================================

-- Authenticated customers can read their own profile; admins can read all profiles
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Authenticated customers can insert their own profile upon registration
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Authenticated customers can update their own profile; admins can update any profile
CREATE POLICY "Users can update own profile or admins update all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: USER ROLES
-- ============================================================================

-- Users can read their own role; administrators can read all roles
CREATE POLICY "Users can read own role or admins read all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Only server-side admin processes or existing admins can grant roles
CREATE POLICY "Only administrators can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- STORAGE BUCKET: 'fashion-styles'
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-styles', 'fashion-styles', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for fashion-styles bucket"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'fashion-styles');

CREATE POLICY "Administrators can upload to fashion-styles bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fashion-styles' AND public.is_admin(auth.uid()));

CREATE POLICY "Administrators can update fashion-styles bucket objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fashion-styles' AND public.is_admin(auth.uid()));

CREATE POLICY "Administrators can delete from fashion-styles bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'fashion-styles' AND public.is_admin(auth.uid()));
