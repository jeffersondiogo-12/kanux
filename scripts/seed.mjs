import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY in env')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY)
const anonSb = createClient(SUPABASE_URL, ANON_KEY)

async function main() {
  console.log('Seeding Supabase...')

  // Create or get auth users (admin and manager)
  console.log('Creating users via Admin API...')
  
  // Try to create, but if exists, that's fine - we'll try to get them
  let admin, manager
  
  // Admin user
  let adminResp = await sb.auth.admin.createUser({ email: 'admin@kanux.test', password: 'Password123!' })
  if (adminResp.error && adminResp.error.code === 'email_exists') {
    console.log('Admin user already exists, fetching...')
    // Fetch existing user
    const { data: users } = await sb.auth.admin.listUsers()
    const existingAdmin = users?.users?.find(u => u.email === 'admin@kanux.test')
    admin = existingAdmin
  } else {
    admin = adminResp?.data?.user
  }
  
  // Manager user
  let managerResp = await sb.auth.admin.createUser({ email: 'manager@kanux.test', password: 'Password123!' })
  if (managerResp.error && managerResp.error.code === 'email_exists') {
    console.log('Manager user already exists, fetching...')
    // Fetch existing user
    const { data: users } = await sb.auth.admin.listUsers()
    const existingManager = users?.users?.find(u => u.email === 'manager@kanux.test')
    manager = existingManager
  } else {
    manager = managerResp?.data?.user
  }
  
  if (!admin || !admin.id) {
    console.error('Failed to create or find admin user')
    process.exit(1)
  }
  if (!manager || !manager.id) {
    console.error('Failed to create or find manager user')
    process.exit(1)
  }
  
  console.log('Admin user ID:', admin.id)
  console.log('Manager user ID:', manager.id)

  // Ensure emails are confirmed
  if (!admin.email_confirmed_at) {
    await sb.auth.admin.updateUserById(admin.id, { email_confirm: true })
  }
  if (!manager.email_confirmed_at) {
    await sb.auth.admin.updateUserById(manager.id, { email_confirm: true })
  }

  // Create or find profiles
  console.log('Finding or creating user profiles...')
  
  // Check if profiles exist
  const profileResult = await sb.from('user_profiles').select('*').in('auth_user_id', [admin.id, manager.id])
  let createdProfiles = profileResult.data || []
  
  if (createdProfiles.length === 0) {
    console.warn('⚠️  No profiles found. Profiles must be manually created via SQL:')
    console.warn(`INSERT INTO user_profiles (auth_user_id, display_name, is_super_admin) VALUES
  ('${admin.id}', 'Super Admin', true),
  ('${manager.id}', 'Manager', false);`)
    console.warn('Continuing with company seeding using user IDs...')
    
    // Use synthetic profile objects with just ID and auth_user_id
    createdProfiles = [
      { id: admin.id, auth_user_id: admin.id, display_name: 'Super Admin' },
      { id: manager.id, auth_user_id: manager.id, display_name: 'Manager' }
    ]
  } else {
    console.log(`✓ Found ${createdProfiles.length} existing profiles`)
  }

  console.log('Seed completed. Note: User profiles need to be manually created in Supabase.')
  console.log(`Admin ID: ${admin.id}`)
  console.log(`Manager ID: ${manager.id}`)
  console.log('Run: npm run dev to start the application')
}

main().catch((err)=>{ console.error(err); process.exit(1) })
