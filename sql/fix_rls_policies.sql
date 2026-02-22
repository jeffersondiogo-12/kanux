-- =====================================================
-- Kanux - Script de Correção de Banco de Dados
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR E HABILITAR RLS NAS TABELAS PRINCIPAIS
-- =====================================================

-- Tabela user_profiles
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Tabela companies  
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;

-- Tabela company_members
ALTER TABLE IF EXISTS public.company_members ENABLE ROW LEVEL SECURITY;

-- Tabela departments
ALTER TABLE IF EXISTS public.departments ENABLE ROW LEVEL SECURITY;

-- Tabela chats
ALTER TABLE IF EXISTS public.chats ENABLE ROW LEVEL SECURITY;

-- Tabela chat_members
ALTER TABLE IF EXISTS public.chat_members ENABLE ROW LEVEL SECURITY;

-- Tabela tickets
ALTER TABLE IF EXISTS public.tickets ENABLE ROW LEVEL SECURITY;

-- Tabela ticket_comments
ALTER TABLE IF EXISTS public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA user_profiles
-- =====================================================

-- Drop existing policies if they exist
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

-- 3. POLÍTICAS PARA companies
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

-- 4. POLÍTICAS PARA company_members
-- =====================================================

DROP POLICY IF EXISTS "Members can read company members" ON public.company_members;
DROP POLICY IF EXISTS "Users can join companies" ON public.company_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.company_members;

-- Members can read company members
CREATE POLICY "Members can read company members" ON public.company_members
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Users can insert themselves as members
CREATE POLICY "Users can join companies" ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can manage members
CREATE POLICY "Admins can manage members" ON public.company_members
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT cm2.company_id FROM public.company_members cm2
      WHERE cm2.user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
      AND cm2.role = 'ADMIN'
    )
  );

-- 5. POLÍTICAS PARA departments
-- =====================================================

DROP POLICY IF EXISTS "Members can read departments" ON public.departments;

CREATE POLICY "Members can read departments" ON public.departments
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- 6. POLÍTICAS PARA chats
-- =====================================================

DROP POLICY IF EXISTS "Members can read chats" ON public.chats;

CREATE POLICY "Members can read chats" ON public.chats
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
    )
    OR is_private = false
  );

-- 7. POLÍTICAS PARA tickets
-- =====================================================

DROP POLICY IF EXISTS "Members can read tickets" ON public.tickets;
DROP POLICY IF EXISTS "Members can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Assignees can update tickets" ON public.tickets;

-- Members can read tickets
CREATE POLICY "Members can read tickets" ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Members can create tickets
CREATE POLICY "Members can create tickets" ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Assignees can update tickets
CREATE POLICY "Assignees can update tickets" ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- 8. POLÍTICAS PARA ticket_comments
-- =====================================================

DROP POLICY IF EXISTS "Members can read comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Members can create comments" ON public.ticket_comments;

CREATE POLICY "Members can read comments" ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_profile_id IN (
          SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Members can create comments" ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_profile_id IN (
          SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- 9. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_profile ON public.company_members(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_company ON public.tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator ON public.tickets(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_chats_company ON public.chats(company_id);

-- 10. GRANT PERMISSIONS BÁSICAS
-- =====================================================

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.company_members TO authenticated;
GRANT SELECT ON public.departments TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.ticket_comments TO authenticated;

GRANT INSERT ON public.user_profiles TO authenticated;
GRANT INSERT ON public.companies TO authenticated;
GRANT INSERT ON public.company_members TO authenticated;
GRANT INSERT ON public.tickets TO authenticated;
GRANT INSERT ON public.ticket_comments TO authenticated;

GRANT UPDATE ON public.user_profiles TO authenticated;
GRANT UPDATE ON public.companies TO authenticated;
GRANT UPDATE ON public.tickets TO authenticated;
GRANT UPDATE ON public.ticket_comments TO authenticated;

-- =====================================================
-- FIM DO SCRIPT
-- Execute no Supabase SQL Editor
-- =====================================================
