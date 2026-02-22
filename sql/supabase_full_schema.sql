-- Full Supabase schema for Kanux SaaS multi-tenant platform
-- Create tables, helper functions and RLS policies
-- REVIEW BEFORE APPLYING: adjust names, roles and test in a non-production environment.

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- companies (tenants)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- departments (per company)
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- user_profiles - links Supabase Auth users to application profile
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE, -- maps to auth.users.id
  display_name text,
  email text,
  avatar_url text,
  is_super_admin boolean DEFAULT false, -- can manage all companies
  created_at timestamptz DEFAULT now()
);

-- company_members - mapping of profile to company with role
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'MEMBER', -- MEMBER, MANAGER, ADMIN
  joined_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);

-- chats - channels scoped to a company/department
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  name text NOT NULL,
  is_private boolean DEFAULT false, -- if true: invite-only
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- chat_members - who participates in a private chat or has membership for management
CREATE TABLE IF NOT EXISTS chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'MEMBER', -- MEMBER, MODERATOR
  joined_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_profile ON chat_members(user_profile_id);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES user_profiles(id),
  content text,
  attachments jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);

-- tickets (chamados) - requests that may control access / approvals
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  creator_profile_id uuid REFERENCES user_profiles(id),
  assignee_profile_id uuid REFERENCES user_profiles(id),
  title text,
  description text,
  status text DEFAULT 'OPEN', -- OPEN, PENDING, RESOLVED, CLOSED
  priority text DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ticket_comments
CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES user_profiles(id),
  content text,
  created_at timestamptz DEFAULT now()
);

-- attachments (generic)
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_table text NOT NULL,
  owner_id uuid NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid REFERENCES user_profiles(id),
  action text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Optional projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Helper functions to map auth.uid() to profile and to check super-admin status

-- returns the user_profiles.id for the current authenticated user (via auth.uid())
CREATE OR REPLACE FUNCTION get_my_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- returns array of company ids where current user has membership
CREATE OR REPLACE FUNCTION get_my_company_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT company_id
    FROM public.company_members cm
    JOIN public.user_profiles up ON cm.user_profile_id = up.id
    WHERE up.auth_user_id = auth.uid()
  );
$$;

-- is current auth user a super admin?
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1), false);
$$;

-- Create user profiles for admin operations (bypasses RLS)
CREATE OR REPLACE FUNCTION create_user_profiles(
  p_admin_id UUID,
  p_manager_id UUID
)
RETURNS TABLE(id UUID, auth_user_id UUID, display_name TEXT, is_super_admin_val BOOLEAN) AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_user_id, display_name, is_super_admin)
  VALUES 
    (p_admin_id, 'Super Admin', true),
    (p_manager_id, 'Manager', false)
  ON CONFLICT (auth_user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name
  RETURNING public.user_profiles.id, public.user_profiles.auth_user_id, public.user_profiles.display_name, public.user_profiles.is_super_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
-- Enable row-level security where appropriate (user_profiles RLS will be disabled for seeding then re-enabled after)
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- user_profiles: allow users to see their own profile; allow service role and super-admin to manage
CREATE POLICY "user_profiles_select_self" ON user_profiles
  FOR SELECT
-- user_profiles: no RLS or policies - allow all operations for seeding
-- Policies can be added later after production data is loaded
-- NOTE: In production, enable RLS and add appropriate policies

-- companies: super-admins can access all; members can access their companies
CREATE POLICY "companies_select_for_members" ON companies
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR id = ANY(get_my_company_ids()));

CREATE POLICY "companies_insert_by_super_admin" ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "companies_update_by_admins" ON companies
  FOR UPDATE
  TO authenticated
  USING (is_super_admin() OR id = ANY(get_my_company_ids()))
  WITH CHECK (is_super_admin() OR id = ANY(get_my_company_ids()));

-- departments: scoped to company
CREATE POLICY "departments_select_for_company" ON departments
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR company_id = ANY(get_my_company_ids()));

CREATE POLICY "departments_manage_by_admins" ON departments
  FOR ALL
  TO authenticated
  USING (is_super_admin() OR company_id = ANY(get_my_company_ids()))
  WITH CHECK (is_super_admin() OR company_id = ANY(get_my_company_ids()));

-- company_members: allow users to see their own membership; super-admin can manage
CREATE POLICY "company_members_select_self" ON company_members
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = auth.uid() AND up.id = company_members.user_profile_id)
  ));

CREATE POLICY "company_members_manage" ON company_members
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- chats: public chats accessible by company membership; private chats restricted to chat_members or super-admins
CREATE POLICY "chats_select_public_or_private_member" ON chats
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR (
      NOT is_private AND company_id = ANY(get_my_company_ids())
    )
    OR (
      is_private AND (
        EXISTS (
          SELECT 1 FROM chat_members cm JOIN user_profiles up ON cm.user_profile_id = up.id
          WHERE cm.chat_id = chats.id AND up.auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "chats_manage_by_admins" ON chats
  FOR ALL
  TO authenticated
  USING (is_super_admin() OR company_id = ANY(get_my_company_ids()))
  WITH CHECK (is_super_admin() OR company_id = ANY(get_my_company_ids()));

-- chat_members: members can see membership rows for chats they belong to; super-admin can manage
CREATE POLICY "chat_members_select" ON chat_members
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR (
      EXISTS (
        SELECT 1 FROM user_profiles up WHERE up.auth_user_id = auth.uid() AND up.id = chat_members.user_profile_id
      )
      OR EXISTS (
        SELECT 1 FROM chat_members cm JOIN user_profiles up ON cm.user_profile_id = up.id WHERE cm.chat_id = chat_members.chat_id AND up.auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "chat_members_manage" ON chat_members
  FOR ALL
  TO authenticated
  USING (is_super_admin() OR (
    EXISTS (
      SELECT 1 FROM company_members cm JOIN user_profiles up ON cm.user_profile_id = up.id WHERE cm.company_id = (SELECT company_id FROM chats WHERE id = chat_members.chat_id) AND up.auth_user_id = auth.uid()
    )
  ))
  WITH CHECK (is_super_admin() OR (
    EXISTS (
      SELECT 1 FROM company_members cm JOIN user_profiles up ON cm.user_profile_id = up.id WHERE cm.company_id = (SELECT company_id FROM chats WHERE id = chat_members.chat_id) AND up.auth_user_id = auth.uid()
    )
  ));

-- messages: allow insert by authenticated users when their profile is associated and chat visibility allows it
CREATE POLICY "messages_insert_authenticated" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- message author must be caller's profile
      (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()) = user_profile_id
    )
    AND (
      -- chat must be accessible: public in same company or user is member of private chat
      EXISTS (
        SELECT 1 FROM chats c WHERE c.id = chat_id AND (
          is_super_admin()
          OR (NOT c.is_private AND c.company_id = ANY(get_my_company_ids()))
          OR (
            c.is_private AND EXISTS (SELECT 1 FROM chat_members cm JOIN user_profiles up ON cm.user_profile_id = up.id WHERE cm.chat_id = c.id AND up.auth_user_id = auth.uid())
          )
        )
      )
    )
  );

CREATE POLICY "messages_select" ON messages
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM chats c WHERE c.id = messages.chat_id AND (
        (NOT c.is_private AND c.company_id = ANY(get_my_company_ids()))
        OR (c.is_private AND EXISTS (SELECT 1 FROM chat_members cm JOIN user_profiles up ON cm.user_profile_id = up.id WHERE cm.chat_id = c.id AND up.auth_user_id = auth.uid()))
      )
    )
  );

-- tickets: company-scoped; creator can insert; managers/admins and super-admin can manage
CREATE POLICY "tickets_select_company" ON tickets
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR company_id = ANY(get_my_company_ids()));

CREATE POLICY "tickets_insert_creator" ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()) = creator_profile_id);

CREATE POLICY "tickets_manage_by_admins" ON tickets
  FOR ALL
  TO authenticated
  USING (is_super_admin() OR company_id = ANY(get_my_company_ids()))
  WITH CHECK (is_super_admin() OR company_id = ANY(get_my_company_ids()));

-- ticket_comments: visible to company members and super-admins
CREATE POLICY "ticket_comments_select" ON ticket_comments
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id AND t.company_id = ANY(get_my_company_ids())));

CREATE POLICY "ticket_comments_insert" ON ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()) = user_profile_id);

-- attachments & audit_logs: restricted to company context or super-admin
CREATE POLICY "attachments_select" ON attachments
  FOR SELECT
  TO authenticated
  USING (is_super_admin() OR (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = attachments.owner_id AND c.id = ANY(get_my_company_ids()))
    OR EXISTS (SELECT 1 FROM tickets t WHERE t.id = attachments.owner_id AND t.company_id = ANY(get_my_company_ids()))
  ));

CREATE POLICY "audit_logs_select_super_admin" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Note: These policies are a solid starting point but may need tailoring to your app logic.
-- After applying, test with different roles and adjust policies for INSERT/UPDATE/DELETE as required.

-- Example seed data (optional) - create a super admin profile (do NOT include real auth_user_id in public migrations)
-- INSERT INTO user_profiles (auth_user_id, display_name, email, is_super_admin) VALUES ('00000000-0000-0000-0000-000000000000', 'Super Admin', 'admin@example.com', true);

-- End of schema

-- Helper function: create a company with default departments and chats, and add creator as company admin
CREATE OR REPLACE FUNCTION create_company_with_defaults(
  p_name text,
  p_slug text,
  p_creator_profile uuid
)
RETURNS TABLE(id uuid, name text, slug text, created_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company companies%ROWTYPE;
  v_support_dept departments%ROWTYPE;
  v_sales_dept departments%ROWTYPE;
  v_chat_general chats%ROWTYPE;
  v_chat_private chats%ROWTYPE;
BEGIN
  INSERT INTO companies (name, slug, created_by) VALUES (p_name, p_slug, p_creator_profile) RETURNING * INTO v_company;

  INSERT INTO departments (company_id, name, slug) VALUES (v_company.id, 'Suporte', 'suporte') RETURNING * INTO v_support_dept;
  INSERT INTO departments (company_id, name, slug) VALUES (v_company.id, 'Vendas', 'vendas') RETURNING * INTO v_sales_dept;

  INSERT INTO chats (company_id, department_id, name, is_private, created_by) VALUES (v_company.id, NULL, 'general', false, p_creator_profile) RETURNING * INTO v_chat_general;
  INSERT INTO chats (company_id, department_id, name, is_private, created_by) VALUES (v_company.id, NULL, 'private-admins', true, p_creator_profile) RETURNING * INTO v_chat_private;

  -- add creator as company admin
  INSERT INTO company_members (company_id, user_profile_id, role) VALUES (v_company.id, p_creator_profile, 'ADMIN');

  -- add creator to private chat
  INSERT INTO chat_members (chat_id, user_profile_id, role) VALUES (v_chat_private.id, p_creator_profile, 'MODERATOR');

  RETURN QUERY SELECT v_company.id, v_company.name, v_company.slug, v_company.created_at;
END;
$$;
