"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import CompanySwitcher from "./CompanySwitcher";

export default function Navbar({ currentCompanyId }: { currentCompanyId?: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = (sessionData as any)?.session;
        if (!mounted) return;
        if (session?.user) {
          const { data } = await supabase.from('user_profiles').select('*').eq('auth_user_id', session.user.id).single();
          if (!mounted) return;
          setProfile(data ?? null);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <header className="h-16 w-full bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg text-gray-900 flex items-center gap-2 hover:text-brand transition-colors">
            <span className="bg-brand px-2 py-1 rounded-lg text-xs text-white">K</span>
            Kanux
          </Link>
          <CompanySwitcher currentCompanyId={currentCompanyId} />
          <nav className="hidden md:flex gap-4">
            <Link href="/chats" className="text-sm text-gray-600 hover:text-brand transition-colors font-medium">Chats</Link>
            <Link href="/tickets" className="text-sm text-gray-600 hover:text-brand transition-colors font-medium">Chamados</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {profile && <span className="text-xs text-gray-500">{profile.display_name}</span>}
          <Link href="/profile" className="text-sm text-gray-600 hover:text-brand px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
            👤
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-600 hover:text-brand"
          >
            ☰
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4 md:hidden shadow-lg">
          <Link href="/chats" className="block text-sm text-gray-600 hover:text-brand py-2">Chats</Link>
          <Link href="/tickets" className="block text-sm text-gray-600 hover:text-brand py-2">Chamados</Link>
        </div>
      )}
    </header>
  );
}

