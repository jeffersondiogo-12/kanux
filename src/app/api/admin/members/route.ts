import { NextResponse } from 'next/server'
import serverSupabase from '@/lib/serverSupabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.company_id || !body.user_profile_id) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    const sb = serverSupabase()
    const { data, error } = await sb.from('company_members').insert({ company_id: body.company_id, user_profile_id: body.user_profile_id, role: body.role || 'MEMBER' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
