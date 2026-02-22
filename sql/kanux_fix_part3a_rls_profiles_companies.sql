-- =====================================================
-- KANUX: Políticas RLS - PARTE 3a
-- user_profiles e companies
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. POLÍTICAS PARA user_profiles
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.user_profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Allow authenticated users to read all profiles (needed for company members)
CREATE POLICY "Anyone can read profiles" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update profiles
CREATE POLICY "Service role can manage profiles" ON public.user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. POLÍTICAS PARA companies
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can create companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;

-- Anyone can read companies
CREATE POLICY "Anyone can read companies" ON public.companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create companies
CREATE POLICY "Authenticated can create companies" ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can update their own companies
CREATE POLICY "Admins can update companies" ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = companies.id
      AND cm.user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
      AND cm.role = 'ADMIN'
    )
  );

-- =====================================================
-- FIM DA PARTE 3a
-- Continue para Parte 3b
-- =====================================================
