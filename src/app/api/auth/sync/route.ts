import { NextResponse } from "next/server";
import serverSupabase from "@/lib/serverSupabase";

// API route para sincronizar perfil do usuário
// Chamado após login para garantir que o perfil existe

export async function POST(req: Request) {
  try {
    const sb = serverSupabase();
    
    // Obter usuário autenticado
    const { data: { user }, error: authError } = await sb.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar se perfil já existe
    const { data: existingProfile } = await sb
      .from("user_profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (existingProfile) {
      // Atualizar email se mudou
      if (existingProfile.email !== user.email) {
        await sb
          .from("user_profiles")
          .update({ email: user.email })
          .eq("id", existingProfile.id);
      }
      
      return NextResponse.json({ 
        success: true, 
        profile: existingProfile,
        isNew: false
      });
    }

    // Criar perfil se não existir
    const displayName = user.email?.split('@')[0] || 'Usuário';
    const { data: newProfile, error: insertError } = await sb
      .from("user_profiles")
      .insert({
        auth_user_id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.user_metadata?.name || displayName,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profile: newProfile,
      isNew: true
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

// GET para obter perfil do usuário atual
export async function GET(req: Request) {
  try {
    const sb = serverSupabase();
    
    const { data: { user }, error: authError } = await sb.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: profile } = await sb
      .from("user_profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
