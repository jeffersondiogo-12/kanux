"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState("pt-BR");
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = (data as any)?.session;
        if (!mounted) return;
        if (session) {
          // Já autenticado → ir para página principal
          router.replace("/");
          return;
        }
      } catch {}
      finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const handlePasswordLogin = async () => {
    setMessage("");
    if (!email || !password) {
      setMessage("Informe e-mail e senha.");
      return;
    }
    if (!companyCode) {
      setMessage("Informe o número da empresa.");
      return;
    }
    setSigningIn(true);
    try {
      // Buscar empresa pelo company_number
      const companyNumber = parseInt(companyCode.trim(), 10);
      
      if (isNaN(companyNumber)) {
        throw new Error("Número da empresa inválido.");
      }
      
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, company_number')
        .eq('company_number', companyNumber)
        .maybeSingle();
      
      if (companyError) {
        console.error('Erro na busca:', companyError);
        throw new Error("Erro ao buscar empresa.");
      }
      
      if (!companyData) {
        throw new Error(`Empresa não encontrada. Número ${companyNumber} não existe.`);
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Persistir company_number selecionado
      try { localStorage.setItem("kanux_company_number", companyCode.trim()); } catch {}
      // Redirecionar para página principal
      router.replace("/");
    } catch (e: any) {
      setMessage("❌ " + (e?.message || "Falha no login"));
    } finally {
      setSigningIn(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6 md:p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <span className="text-white text-2xl font-bold">K</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-3">Entrar</h1>
            <p className="text-muted-foreground text-sm">Acesse com seu usuário, senha e código da empresa</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {/* user icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <input
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-muted/70 border border-border text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {/* lock icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-muted/70 border border-border text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                type="password"
                placeholder="sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordLogin(); }}
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {/* building icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18"/><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 18h12"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/></svg>
              </span>
              <input
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-muted/70 border border-border text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="número da empresa"
                type="number"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
              />
            </div>

            <button
              onClick={handlePasswordLogin}
              disabled={signingIn}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {signingIn && <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full"/>}
              <span>{signingIn ? "Entrando..." : "Entrar"}</span>
            </button>

            {message && (
              <div className={`text-sm ${message.startsWith("❌") ? "text-red-400" : "text-green-400"}`}>{message}</div>
            )}

            <div className="pt-2">
              <label className="block text-xs text-muted-foreground mb-1">Idioma</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">🇧🇷</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-lg bg-muted/70 border border-border text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                >
                  <option value="pt-BR">Português</option>
                  <option value="en-US">English</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-4">Kanux • Multi-empresas • 2026</p>
      </div>
    </div>
  );
}
