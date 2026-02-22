"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel'
import LoginForm from '@/components/LoginForm'
import { supabase } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar';

export default function ChatsPageContent(){
  const params = useSearchParams();
  const chatId = params?.get('chatId') ?? null;
  const companyIdParam = params?.get('companyId');
  const [session, setSession] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try{
        const { data } = await supabase.auth.getSession();
        if(!mounted) return;
        const s = (data as any)?.session ?? null;
        setSession(s);
        
        if(s?.user) {
          const { data: profileData } = await supabase.from('user_profiles').select('*').eq('auth_user_id', s.user.id).single();
          if(!mounted) return;
          setProfile(profileData);
          
          // Get companyId from params or localStorage
          const qpCompanyId = companyIdParam || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("companyId") : null) || "";
          if (qpCompanyId) {
            setActiveCompanyId(qpCompanyId);
          } else if (profileData?.id) {
            const { data: memberships } = await supabase
              .from("company_members")
              .select("company_id")
              .eq("user_profile_id", profileData.id)
              .limit(1);
            if (!mounted) return;
            if (memberships && memberships.length > 0) {
              setActiveCompanyId(memberships[0].company_id);
            }
          }
        }
        setLoading(false);
      }catch(e){
        setLoading(false);
      }
    })();
    return ()=>{ mounted = false };
  },[companyIdParam]);

  // Fetch chats based on company
  useEffect(() => {
    if (!activeCompanyId) return;
    
    let mounted = true;
    (async () => {
      try {
        const { data: chatsData } = await supabase
          .from('chats')
          .select('*')
          .eq('company_id', activeCompanyId)
          .order('created_at', { ascending: true });
        if (!mounted) return;
        setChats(chatsData ?? []);
      } catch (e) {
        console.error("Error fetching chats:", e);
      }
    })();
    return () => { mounted = false };
  }, [activeCompanyId]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
        <LoginForm />
      </div>
    )
  }

  const publicChats = chats.filter(c => !c.is_private);
  const privateChats = chats.filter(c => c.is_private);
  const currentChat = chats.find(c => c.id === chatId);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Sidebar currentCompanyId={activeCompanyId} />
      
      <main className="flex-1 flex pt-14">
        {/* Chat List Sidebar */}
        <div className="w-64 bg-card border-r border-border flex flex-col overflow-y-auto fixed h-full">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold text-sm text-muted-foreground">CHATS</h3>
          </div>
          
          {/* Chats Públicos */}
          {publicChats.length > 0 && (
            <div className="px-2 py-3">
              <p className="text-xs font-bold text-muted-foreground px-2 py-1">PÚBLICOS</p>
              {publicChats.map(c => (
                <a
                  key={c.id}
                  href={`/chats?chatId=${c.id}&companyId=${activeCompanyId}`}
                  className={`block text-sm py-2 px-3 rounded my-1 transition ${
                    chatId === c.id
                      ? 'bg-brand text-white font-semibold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  # {c.name}
                </a>
              ))}
            </div>
          )}

          {/* Chats Privados */}
          {privateChats.length > 0 && (
            <div className="px-2 py-3 border-t border-border">
              <p className="text-xs font-bold text-muted-foreground px-2 py-1">PRIVADOS</p>
              {privateChats.map(c => (
                <a
                  key={c.id}
                  href={`/chats?chatId=${c.id}&companyId=${activeCompanyId}`}
                  className={`block text-sm py-2 px-3 rounded my-1 transition ${
                    chatId === c.id
                      ? 'bg-brand text-white font-semibold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  🔒 {c.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Chat Panel Principal */}
        <div className="flex-1 flex flex-col ml-64">
          {chatId && currentChat ? (
            <>
              <div className="h-14 bg-card border-b border-border flex items-center px-4 shadow-sm">
                <h2 className="font-semibold text-foreground">
                  {currentChat.is_private ? '🔒' : '#'} {currentChat.name}
                </h2>
              </div>
              <ChatPanel chatId={chatId} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Selecione um chat</p>
                <p className="text-sm">ou comece uma nova conversa</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

