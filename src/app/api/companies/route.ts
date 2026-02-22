import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: Request) {
  try {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Get companies the user belongs to
    const { data: companies, error } = await sb
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: companies })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
