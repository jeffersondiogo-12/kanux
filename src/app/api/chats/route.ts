import { NextResponse } from 'next/server';
import serverSupabase from '@/lib/serverSupabase';

export async function GET(req: Request) {
  // query params: companyId or chatId
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  const companyId = searchParams.get('companyId');
  const sb = serverSupabase();

  if (chatId) {
    const { data, error } = await sb.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }).limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (companyId) {
    const { data, error } = await sb.from('chats').select('*').eq('company_id', companyId).order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'missing chatId or companyId' }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = serverSupabase();
    // For creating message or chat
    if (body.type === 'message') {
      const payload = { chat_id: body.chatId, content: body.content, user_profile_id: body.user_profile_id };
      const { data, error } = await sb.from('messages').insert(payload).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    if (body.type === 'chat') {
      const payload = { company_id: body.companyId, department_id: body.departmentId ?? null, name: body.name, is_private: !!body.is_private, created_by: body.created_by };
      const { data, error } = await sb.from('chats').insert(payload).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
