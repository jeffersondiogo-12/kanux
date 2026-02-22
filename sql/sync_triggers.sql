-- =====================================================
-- KANUX: Sincronização de Usuários e Empresas
-- Execute este script no seu banco Supabase
-- =====================================================

-- 1. Função para criar perfil automaticamente ao registrar usuário no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o perfil já existe
  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, email, display_name, is_super_admin)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      FALSE
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar o trigger (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Função para vincular usuário a empresa por email (opcional - para SUPER ADMIN)
CREATE OR REPLACE FUNCTION public.assign_user_to_company_by_email()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Se o usuário for super admin, não vincula automaticamente
  IF NEW.is_super_admin = TRUE THEN
    RETURN NEW;
  END IF;

  -- Tentar encontrar empresa pelo domínio do email
  -- Ex: @empresa.com → empresa com slug 'empresa'
  IF NEW.email LIKE '%@%' THEN
    SELECT c.id INTO v_company_id
    FROM public.companies c
    WHERE c.slug = LOWER(SPLIT_PART(NEW.email, '@', 1))
    LIMIT 1;
    
    -- Se encontrou empresa, adiciona como membro
    IF v_company_id IS NOT NULL THEN
      INSERT INTO public.company_members (company_id, user_profile_id, role)
      VALUES (v_company_id, NEW.id, 'MEMBER')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. (Opcional) Trigger para auto-vinculação após criar perfil
-- descomente se quiser vinculação automática por domínio de email
-- DROP TRIGGER IF EXISTS on_profile_created ON public.user_profiles;
-- CREATE TRIGGER on_profile_created
--   AFTER INSERT ON public.user_profiles
--   FOR EACH ROW EXECUTE FUNCTION public.assign_user_to_company_by_email();

-- 5. Verificar se as FKs existem (se não existirem, criar)
-- FK: user_profiles.auth_user_id → auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_auth_user_fkey' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_auth_user_fkey 
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: company_members.company_id → companies.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'company_members_company_fkey' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.company_members 
    ADD CONSTRAINT company_members_company_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: company_members.user_profile_id → user_profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'company_members_user_profile_fkey' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.company_members 
    ADD CONSTRAINT company_members_user_profile_fkey 
    FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Permitir que usuários leiam seus próprios perfis
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(
  id uuid,
  auth_user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  is_super_admin boolean,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT up.*
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid();
END;
$$;

-- 7. Função helper para listar empresas do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  role text,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.slug, cm.role, c.created_at
  FROM public.companies c
  JOIN public.company_members cm ON cm.company_id = c.id
  JOIN public.user_profiles up ON up.id = cm.user_profile_id
  WHERE up.auth_user_id = auth.uid();
END;
$$;

-- =====================================================
-- FIM DO SCRIPT
-- Execute no Supabase SQL Editor
-- =====================================================
