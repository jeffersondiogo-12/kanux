-- =====================================================
-- KANUX: Teste de Autenticação
-- Execute no Supabase SQL Editor para verificar usuários
-- =====================================================

-- 1. Ver usuários no auth.users (sem ver senhas)
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Ver perfis de usuário
SELECT id, auth_user_id, display_name, email, is_super_admin, created_at
FROM public.user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 3. Ver empresas
SELECT id, name, slug, created_at
FROM public.companies
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver membros de empresas
SELECT cm.id, cm.company_id, cm.user_profile_id, cm.role, c.name as company_name, up.email as user_email
FROM public.company_members cm
JOIN public.companies c ON c.id = cm.company_id
JOIN public.user_profiles up ON up.id = cm.user_profile_id
LIMIT 20;

-- 5. Verificar se trigger existe
SELECT tgname as trigger_name, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 6. Verificar RLS nas tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'companies', 'company_members', 'tickets');

-- 7. Ver políticas RLS ativas
SELECT 
    schemaname || '.' || tablename as table,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
