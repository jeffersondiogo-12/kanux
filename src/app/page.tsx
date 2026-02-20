"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LoginForm from "@/components/LoginForm";

interface Company {
  id: string;
  name: string;
  slug: string;
}

function HomeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const companyIdParam = params?.get("companyId");
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const s = (sessionData as any)?.session;
        if (!mounted) return;
        setSession(s);

        if (s?.user) {
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("auth_user_id", s.user.id)
            .single();
          if (!mounted) return;
          setProfile(profileData);

          const { data: memberships } = await supabase
            .from("company_members")
            .select("company_id, companies(id, name, slug)")
            .eq("user_profile_id", profileData?.id);

          const userCompanies = (memberships || []).map((m: any) => m.companies).filter(Boolean);
          if (!mounted) return;
          setCompanies(userCompanies);

          if (companyIdParam) {
            setCurrentCompanyId(companyIdParam);
          } else if (userCompanies.length > 0) {
            setCurrentCompanyId(userCompanies[0].id);
          }
        }
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [companyIdParam]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>
    );
  }

  const currentCompany = companies.find((c) => c.id === currentCompanyId) || companies[0];
  const isSuperAdmin = profile?.is_super_admin;

  return (
    <main className="min-h-screen bg-surface text-gray-800">
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center shadow-sm">
                <span className="font-bold text-white">K</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Kanux</span>
            </div>
            {companies.length > 1 && (
              <select
                value={currentCompanyId}
                onChange={(e) => setCurrentCompanyId(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-sm font-semibold text-white">
                {profile?.display_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-sm text-gray-600">{profile?.display_name}</span>
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-brand transition">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bem-vindo{currentCompany ? ` à ${currentCompany.name}` : ""}!
          </h1>
          <p className="text-gray-500 mt-1">O que você gostaria de fazer hoje?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => router.push(`/chats?companyId=${currentCompanyId}`)}
            className="p-6 bg-white rounded-xl border border-gray-200 hover:border-brand hover:shadow-floating transition group text-left"
          >
            <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Chats</h3>
            <p className="text-sm text-gray-500 mt-1">Converse com sua equipe</p>
          </button>

          <button
            onClick={() => router.push(`/tickets?companyId=${currentCompanyId}`)}
            className="p-6 bg-white rounded-xl border border-gray-200 hover:border-brand hover:shadow-floating transition group text-left"
          >
            <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Chamados</h3>
            <p className="text-sm text-gray-500 mt-1">Abra e acompanhe tickets</p>
          </button>

          <button
            onClick={() => router.push(`/profile`)}
            className="p-6 bg-white rounded-xl border border-gray-200 hover:border-brand hover:shadow-floating transition group text-left"
          >
            <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Meu Perfil</h3>
            <p className="text-sm text-gray-500 mt-1">Edite suas informações</p>
          </button>

          {(isSuperAdmin || profile?.role === "ADMIN") && (
            <button
              onClick={() => router.push(`/admin?companyId=${currentCompanyId}`)}
              className="p-6 bg-white rounded-xl border border-gray-200 hover:border-brand hover:shadow-floating transition group text-left"
            >
              <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-gray-900">Admin</h3>
              <p className="text-sm text-gray-500 mt-1">Gerencie a empresa</p>
            </button>
          )}
        </div>

        {isSuperAdmin && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Todas as Empresas</h2>
              <button
                onClick={() => router.push(`/admin?companyId=${currentCompanyId}`)}
                className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition text-sm shadow-sm"
              >
                + Nova Empresa
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {companies.map((company) => (
                <div key={company.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-card">
                  <h3 className="font-semibold text-gray-900">{company.name}</h3>
                  <p className="text-sm text-gray-500">@{company.slug}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-card">
            <p className="text-sm text-gray-500">Empresas</p>
            <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-card">
            <p className="text-sm text-gray-500">Seu Papel</p>
            <p className="text-2xl font-bold text-gray-900">{isSuperAdmin ? "Super Admin" : profile?.role || "Membro"}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-card">
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-2xl font-bold text-brand">● Ativo</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

