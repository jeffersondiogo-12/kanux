"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export default function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Verificar se usuário já está logado
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Garantir que perfil existe
        await ensureProfileExists(session.user.id, session.user.email);
        if (onSuccess) onSuccess();
        else if (redirectTo) router.push(redirectTo);
      }
    };
    checkSession();
  }, []);

  // Função para garantir que perfil existe
  const ensureProfileExists = async (userId: string, userEmail: string | undefined) => {
    try {
      // Verificar se perfil já existe
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_user_id", userId)
        .single();

      if (!existingProfile) {
        // Criar perfil se não existir
        const displayName = userEmail?.split('@')[0] || 'Usuário';
        await supabase.from("user_profiles").insert({
          auth_user_id: userId,
          email: userEmail,
          display_name: displayName,
        });
      }
    } catch (e) {
      console.error("Erro ao verificar/criar perfil:", e);
    }
  };

  const signIn = async () => {
    setMessage("");
    if (!email || !password) {
      setMessage("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;

      // Garantir que perfil existe após login
      if (data.user) {
        await ensureProfileExists(data.user.id, data.user.email);
      }

      setMessage("✓ Login realizado.");
      
      if (onSuccess) {
        onSuccess();
      } else if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push("/");
      }
      
      router.refresh();
    } catch (e: any) {
      setMessage("❌ " + (e?.message || "Falha no login"));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    setMessage("");
    if (!email || !password) {
      setMessage("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: email.split('@')[0],
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await ensureProfileExists(data.user.id, data.user.email);
      }

      setMessage("✓ Cadastro realizado! Verifique seu email para confirmar.");
    } catch (e: any) {
      setMessage("❌ " + (e?.message || "Falha no cadastro"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Entrar no Kanux</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Informe seu e-mail e senha para acessar.
      </p>

      <div className="space-y-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          type="email"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="senha"
          type="password"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          onKeyDown={(e) => { if (e.key === 'Enter') signIn(); }}
        />
        <button
          onClick={signIn}
          disabled={loading || !email || !password}
          className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <button
          onClick={signUp}
          disabled={loading || !email || !password}
          className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Aguarde..." : "Cadastrar"}
        </button>
      </div>

      {message && (
        <p className={`mt-4 text-sm ${message.startsWith("✓") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

