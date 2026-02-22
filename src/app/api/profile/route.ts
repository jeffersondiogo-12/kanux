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

    const { data: profile, error } = await sb
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: profile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const { display_name, avatar_url } = body

    const { data: profile, error } = await sb
      .from('user_profiles')
      .update({ display_name, avatar_url, updated_at: new Date().toISOString() })
      .eq('auth_user_id', session.user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: profile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
