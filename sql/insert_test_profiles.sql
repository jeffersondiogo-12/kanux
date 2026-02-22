-- Insert test user profiles
-- Admin user ID: a2c87dc5-6eb1-4d23-9c2b-70ecc7911a57
-- Manager user ID: 9a50bcce-8546-45ae-bed5-a0270bb34deb

INSERT INTO user_profiles (auth_user_id, display_name, is_super_admin, email)
VALUES 
  ('a2c87dc5-6eb1-4d23-9c2b-70ecc7911a57', 'Super Admin', true, 'admin@kanux.test'),
  ('9a50bcce-8546-45ae-bed5-a0270bb34deb', 'Manager', false, 'manager@kanux.test')
ON CONFLICT (auth_user_id) DO UPDATE
SET 
  display_name = EXCLUDED.display_name,
  is_super_admin = EXCLUDED.is_super_admin;
