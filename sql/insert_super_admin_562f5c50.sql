-- Seed: register provided auth user as Super Admin in user_profiles
-- Apply this in Supabase SQL Editor or via your seed pipeline.

INSERT INTO user_profiles (auth_user_id, display_name, is_super_admin, email)
VALUES ('562f5c50-7d52-481b-aba1-c9ae713c21c7', 'Super Admin', true, 'admin@kanux.test')
ON CONFLICT (auth_user_id) DO UPDATE
SET 
  display_name = EXCLUDED.display_name,
  is_super_admin = EXCLUDED.is_super_admin,
  email = COALESCE(EXCLUDED.email, user_profiles.email);
