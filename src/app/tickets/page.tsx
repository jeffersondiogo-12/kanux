"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import Sidebar from "@/components/Sidebar";

interface TicketRow {
  id: string;
  number: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  creator_profile_id: string | null;
  company_id: string;
}

function TicketsPageContent() {
  const params = useSearchParams();
  const companyIdParam = params?.get("companyId");
  
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [savingTicket, setSavingTicket] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const s = (sessionData as any)?.session;
        if (!mounted) return;
        setSession(s);

        if (s?.user) {
          // load profile
          const { data: p } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("auth_user_id", s.user.id)
            .single();
          if (!mounted) return;
          setProfile(p);

          // read companyId from URL (?companyId=...) or use param
          const qpCompanyId = companyIdParam || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("companyId") : null) || "";
          if (qpCompanyId) {
            setActiveCompanyId(qpCompanyId);
          } else if (p?.id) {
            // fallback: first membership
            const { data: memberships } = await supabase
              .from("company_members")
              .select("company_id")
              .eq("user_profile_id", p.id)
              .limit(1);
            if (!mounted) return;
            if (memberships && memberships.length > 0) {
              setActiveCompanyId(memberships[0].company_id);
            }
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
  }, []);

  useEffect(() => {
    if (!activeCompanyId || !session) return;

    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("id, number, title, description, status, priority, created_at, creator_profile_id, company_id")
          .eq("company_id", activeCompanyId)
          .order("created_at", { ascending: false });
        if (error) console.error(error);
        if (mounted) setTickets(data || []);
      } catch (e) {
        console.error("Error fetching tickets:", e);
      }
    })();
    return () => { mounted = false };
  }, [activeCompanyId, session]);

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim()) {
      alert("Título é obrigatório");
      return;
    }
    if (!activeCompanyId || !profile?.id) {
      alert("Empresa ou perfil não localizado");
      return;
    }

    setSavingTicket(true);
    try {
      const payload = {
        title: newTicket.title,
        description: newTicket.description,
        priority: newTicket.priority,
        status: "OPEN",
        company_id: activeCompanyId,
        creator_profile_id: profile.id,
      };
      const { data, error } = await supabase
        .from("tickets")
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert("Erro ao criar ticket: " + error.message);
      } else if (data) {
        setTickets([data as TicketRow, ...tickets]);
        setNewTicket({ title: "", description: "", priority: "MEDIUM" });
        setShowCreateForm(false);
      }
    } catch (e: any) {
      alert("Erro: " + e.message);
    } finally {
      setSavingTicket(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      case "MEDIUM":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      case "LOW":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300";
      case "IN_PROGRESS":
        return "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300";
      case "CLOSED":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Sidebar currentCompanyId={activeCompanyId} />
      
      <main className="flex-1 text-foreground p-6 pt-16 md:pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Chamados (Tickets)
            </h1>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
            >
              {showCreateForm ? "Cancelar" : "+ Novo Ticket"}
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-card rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 text-foreground">
                Criar Novo Ticket
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    placeholder="Título do ticket"
                    className="w-full px-4 py-2 rounded border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Descreva o problema ou solicitação"
                    rows={4}
                    className="w-full px-4 py-2 rounded border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-4 py-2 rounded border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateTicket}
                  disabled={savingTicket}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {savingTicket ? "Criando..." : "Criar Ticket"}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {tickets.length === 0 ? (
              <div className="bg-card rounded-lg shadow p-8 text-center">
                <p className="text-muted-foreground text-lg">Nenhum ticket encontrado</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block bg-card rounded-lg shadow p-6 hover:shadow-lg hover:bg-muted/50 transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{ticket.title}</h3>
                      <p className="text-muted-foreground mb-3 line-clamp-2">{ticket.description || "Sem descrição"}</p>
                      <p className="text-sm text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.toUpperCase() === "OPEN" ? "Aberto" : ticket.status.toUpperCase() === "IN_PROGRESS" ? "Em Progresso" : "Fechado"}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase() === "HIGH" ? "Alta" : ticket.priority.toUpperCase() === "MEDIUM" ? "Média" : "Baixa"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <TicketsPageContent />
    </Suspense>
  );
}

