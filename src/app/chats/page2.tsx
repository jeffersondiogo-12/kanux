"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel'
import LoginForm from '@/components/LoginForm'
import { supabase } from '@/lib/supabaseClient'

export default function ChatsPage(){
  const params = useSearchParams();
  const chatId = params?.get('chatId') ?? null;
  const [session, setSession] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          
          const { data: chatsData } = await supabase.from('chats').select('*').order('created_at', { ascending: true });
          if(!mounted) return;
          setChats(chatsData ?? []);
        }
        setLoading(false);
      }catch(e){
        setLoading(false);
      }
    })();
    return ()=>{ mounted = false };
  },[]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <LoginForm />
      </div>
    )
  }

  const publicChats = chats.filter(c => !c.is_private);
  const privateChats = chats.filter(c => c.is_private);
  const currentChat = chats.find(c => c.id === chatId);

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-800">
      {/* Sidebar - Lista de Chats */}
      <div className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 overflow-y-auto hidden md:flex">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold text-sm text-slate-300">CHATS</h3>
        </div>
        
        {/* Chats Públicos */}
        {publicChats.length > 0 && (
          <div className="px-2 py-3">
            <p className="text-xs font-bold text-slate-500 px-2 py-1">PÚBLICOS</p>
            {publicChats.map(c => (
              <a
                key={c.id}
                href={`/chats?chatId=${c.id}`}
                className={`block text-sm py-2 px-3 rounded my-1 transition ${
                  chatId === c.id
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                # {c.name}
              </a>
            ))}
          </div>
        )}

        {/* Chats Privados */}
        {privateChats.length > 0 && (
          <div className="px-2 py-3 border-t border-slate-800">
            <p className="text-xs font-bold text-slate-500 px-2 py-1">PRIVADOS</p>
            {privateChats.map(c => (
              <a
                key={c.id}
                href={`/chats?chatId=${c.id}`}
                className={`block text-sm py-2 px-3 rounded my-1 transition ${
                  chatId === c.id
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                🔒 {c.name}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Chat Panel Principal */}
      <div className="flex-1 flex flex-col">
        {chatId && currentChat ? (
          <>
            <div className="h-14 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center px-4 shadow-sm">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {currentChat.is_private ? '🔒' : '#'} {currentChat.name}
              </h2>
            </div>
            <ChatPanel chatId={chatId} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Selecione um chat</p>
              <p className="text-sm">ou comece uma nova conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
