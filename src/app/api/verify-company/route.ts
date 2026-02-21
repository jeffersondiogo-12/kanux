import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Criar cliente admin com service role (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { company_number } = await request.json();
    
    if (!company_number) {
      return NextResponse.json(
        { error: 'Número da empresa é obrigatório' },
        { status: 400 }
      );
    }
    
    const companyNumber = parseInt(company_number, 10);
    
    if (isNaN(companyNumber)) {
      return NextResponse.json(
        { error: 'Número da empresa inválido' },
        { status: 400 }
      );
    }
    
    // Buscar empresa usando cliente admin (bypass RLS)
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, slug, company_number')
      .eq('company_number', companyNumber)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao buscar empresa:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar empresa' },
        { status: 500 }
      );
    }
    
    if (!company) {
      return NextResponse.json(
        { error: `Empresa não encontrada. Número ${companyNumber} não existe.` },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ company });
    
  } catch (err) {
    console.error('Erro na API:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

