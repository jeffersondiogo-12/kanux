import { NextResponse } from 'next/server';
import serverSupabase from '@/lib/serverSupabase';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get('companyId');
  const ticketId = url.searchParams.get('ticketId');
  const sb = serverSupabase();

  if (ticketId) {
    const { data, error } = await sb.from('tickets').select('*').eq('id', ticketId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (companyId) {
    const { data, error } = await sb.from('tickets').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'missing params' }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = serverSupabase();
    if (!body.title || !body.creator_profile_id || !body.company_id) return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    const payload = {
      number: body.number ?? null,
      company_id: body.company_id,
      department_id: body.department_id ?? null,
      creator_profile_id: body.creator_profile_id,
      assignee_profile_id: body.assignee_profile_id ?? null,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? 'OPEN',
      priority: body.priority ?? 'MEDIUM',
    };
    const { data, error } = await sb.from('tickets').insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
