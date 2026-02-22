import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  console.log('Cleaning up test data from Supabase...')

  // Delete test auth users
  console.log('Deleting test auth users...')
  try {
    const { data: users } = await sb.auth.admin.listUsers()
    const testEmails = ['admin@kanux.test', 'manager@kanux.test']
    
    for (const user of users?.users || []) {
      if (testEmails.includes(user.email)) {
        console.log(`Deleting user: ${user.email}`)
        await sb.auth.admin.deleteUser(user.id)
      }
    }
  } catch (e) {
    console.warn('Error deleting users:', e.message)
  }

  // Delete test data from tables
  console.log('Deleting test profiles and companies...')
  try {
    // Delete profiles with specific emails
    await sb.from('user_profiles').delete().in('email', ['admin@kanux.test', 'manager@kanux.test'])
    console.log('✓ Deleted test profiles')
  } catch (e) {
    console.warn('Error deleting profiles:', e.message)
  }

  try {
    // Delete test companies
    await sb.from('companies').delete().in('slug', ['empresa-a', 'empresa-b'])
    console.log('✓ Deleted test companies')
  } catch (e) {
    console.warn('Error deleting companies:', e.message)
  }

  console.log('Cleanup complete! You can now run: npm run seed')
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
