-- SQL Migration: Fix Auth Sync and Database Relationships
-- Execute this in Supabase SQL Editor

-- ============================================
-- FASE 1: Criar função de sincronização automática
-- ============================================

-- 1.1: Função para criar perfil automaticamente quando usuário se registra no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verifica se já existe perfil para este usuário
  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, email, display_name, created_at)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(
        NEW.raw_user_meta_data->>'display_name', 
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      NOW()
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name);
  END IF;
  RETURN NEW;
END;
$$;

-- 1.2: Criar trigger para executar a função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FASE 2: Criar Foreign Keys
-- ============================================

-- 2.1: FK para company_members -> companies
ALTER TABLE public.company_members 
  ADD CONSTRAINT fk_company_member_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2.2: FK para company_members -> user_profiles  
ALTER TABLE public.company_members 
  ADD CONSTRAINT fk_company_member_profile 
  FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 2.3: FK para tickets -> companies
ALTER TABLE public.tickets 
  ADD CONSTRAINT fk_ticket_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2.4: FK para tickets -> user_profiles (creator)
ALTER TABLE public.tickets 
  ADD CONSTRAINT fk_ticket_creator 
  FOREIGN KEY (creator_profile_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 2.5: FK para tickets -> user_profiles (assignee)
ALTER TABLE public.tickets 
  ADD CONSTRAINT fk_ticket_assignee 
  FOREIGN KEY (assignee_profile_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- ============================================
-- FASE 3: Limpar registros órfãos
-- ============================================

-- 3.1: Remover company_members órfãos (sem company)
DELETE FROM public.company_members cm
WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = cm.company_id);

-- 3.2: Remover company_members órfãos (sem profile)
DELETE FROM public.company_members cm
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = cm.user_profile_id);

-- 3.3: Remover tickets órfãos (sem company)
DELETE FROM public.tickets t
WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = t.company_id);

-- ============================================
-- FASE 4: Criar índices para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_profile_id ON public.company_members(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_tickets_company_id ON public.tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_profile_id ON public.tickets(creator_profile_id);

-- ============================================
-- FASE 5: Função helper para obter empresas do usuário atual
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE(id uuid, name text, slug text) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT c.id, c.name, c.slug
  FROM public.companies c
  JOIN public.company_members cm ON c.id = cm.company_id
  JOIN public.user_profiles up ON cm.user_profile_id = up.id
  WHERE up.auth_user_id = auth.uid()
  ORDER BY c.name;
$$;

-- ============================================
-- FASE 6: Função para vincular usuário a empresa
-- ============================================

CREATE OR REPLACE FUNCTION public.add_user_to_company(
  p_user_profile_id uuid,
  p_company_id uuid,
  p_role text DEFAULT 'MEMBER'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_profile_id, role)
  VALUES (p_company_id, p_user_profile_id, p_role)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Resultado esperado: "Success. No rows returned" para cada comando
-- Verificar se trigger foi criado:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
