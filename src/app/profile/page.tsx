"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LoginForm from "@/components/LoginForm";
import Sidebar from "@/components/Sidebar";

interface Company {
  id: string;
  name: string;
  slug: string;
  company_number: number;
}

function ProfilePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const companyIdParam = params?.get("companyId");
  
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

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
          setDisplayName(profileData?.display_name || "");
          setAvatarUrl(profileData?.avatar_url || "");

          let userCompanies: Company[] = [];
          if (profileData?.is_super_admin) {
            const { data: allCompanies } = await supabase
              .from("companies")
              .select("id, name, slug, company_number")
              .order("created_at", { ascending: false });
            userCompanies = (allCompanies as any) || [];
          } else if (profileData?.id) {
            const { data: memberships } = await supabase
              .from("company_members")
              .select("companies(id, name, slug, company_number)")
              .eq("user_profile_id", profileData.id);
            userCompanies = (memberships || [])
              .map((m: any) => m.companies)
              .filter(Boolean);
          }
          if (!mounted) return;
          setCompanies(userCompanies);

          // read companyId from URL (?companyId=...) or use param
          const qpCompanyId = companyIdParam || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("companyId") : null) || "";
          let resolved: Company | null = null;
          if (qpCompanyId) {
            resolved = userCompanies.find(c => c.id === qpCompanyId) || null;
            if (!resolved) {
              const { data: found } = await supabase
                .from("companies")
                .select("id, name, slug, company_number")
                .eq("id", qpCompanyId)
                .single();
              resolved = (found as any) || null;
            }
          }
          if (!resolved) {
            try {
              const companyNumber = localStorage.getItem("kanux_company_number");
              if (companyNumber) {
                const { data: foundByNumber } = await supabase
                  .from("companies")
                  .select("id, name, slug, company_number")
                  .eq("company_number", parseInt(companyNumber))
                  .single();
                if (foundByNumber) resolved = foundByNumber as any;
              }
            } catch {}
          }
          if (!resolved && userCompanies.length > 0) {
            resolved = userCompanies[0];
          }
          if (!mounted) return;
          setCurrentCompany(resolved || null);
        }
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  const handleSaveProfile = async () => {
    setError("");
    setSuccess("");

    if (!displayName.trim()) {
      setError("Nome não pode estar vazio");
      return;
    }

    setSavingProfile(true);
    try {
      const { error: err } = await supabase
        .from("user_profiles")
        .update({ display_name: displayName, avatar_url: avatarUrl || null })
        .eq("auth_user_id", session.user.id);

      if (err) {
        setError(err.message);
      } else {
        setProfile({ ...profile, display_name: displayName, avatar_url: avatarUrl });
        setSuccess("✓ Perfil atualizado!");
        setEditing(false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Senhas não correspondem");
      return;
    }

    setSavingProfile(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) {
        setError(err.message);
      } else {
        setSuccess("✓ Senha alterada!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Sidebar currentCompanyId={currentCompany?.id} />
      
      <main className="flex-1 text-foreground p-6 pt-16 md:pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="header-grad rounded-2xl p-6 mb-6">
            <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
            <p className="text-emerald-200 mt-1">Gerencie suas informações e empresas</p>
          </div>

          <div className="card p-6 mb-6">
            <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Empresas
            </h2>
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-1">Empresa atual</p>
              {currentCompany ? (
                <p className="text-lg font-semibold text-white">
                  {currentCompany.name} <span className="text-emerald-400">#{currentCompany.company_number}</span>
                </p>
              ) : (
                <p className="text-slate-500">Nenhuma empresa selecionada</p>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Empresas com acesso</p>
              {companies.length === 0 ? (
                <p className="text-slate-500">Nenhuma empresa encontrada</p>
              ) : (
                <ul className="space-y-2">
                  {companies.map((c) => (
                    <li key={c.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-white">
                        {c.name} <span className="text-emerald-400">#{c.company_number}</span>
                      </span>
                      <button
                        onClick={() => router.push(`/chats?companyId=${c.id}`)}
                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                          currentCompany?.id === c.id 
                            ? "bg-emerald-500 text-white" 
                            : "bg-slate-700 text-slate-300 hover:bg-emerald-600 hover:text-white"
                        }`}
                      >
                        {currentCompany?.id === c.id ? "Atual" : "Ir"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card p-6 mb-6">
            <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informações do Perfil
            </h2>
            <div className="flex items-center gap-6 mb-6">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-500/25">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-lg font-semibold text-white mb-2">{session.user.email}</p>
                <p className="text-sm text-slate-400">Nome</p>
                <p className="text-lg font-semibold text-white">{displayName}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4">{error}</div>
            )}
            {success && (
              <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg mb-4">{success}</div>
            )}

            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-primary">Editar Perfil</button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">URL do Avatar</label>
                  <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://exemplo.com/avatar.jpg" className="input w-full" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">{savingProfile ? "Salvando..." : "Salvar"}</button>
                  <button onClick={() => setEditing(false)} className="btn-muted">Cancelar</button>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6 mb-6">
            <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Alterar Senha
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nova Senha</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar Senha</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input w-full" />
              </div>
              <button onClick={handleChangePassword} disabled={savingProfile} className="btn-primary">{savingProfile ? "Alterando..." : "Alterar Senha"}</button>
            </div>
          </div>

          <div className="card p-6">
            <button onClick={handleSignOut} className="btn-muted bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30">Sair da Conta</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
