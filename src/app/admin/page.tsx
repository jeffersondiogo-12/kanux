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
  created_at: string;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  slug: string;
}

interface Chat {
  id: string;
  name: string;
  is_private: boolean;
  department_id: string;
}

function AdminPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const companyIdParam = params?.get("companyId");
  
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", slug: "" });
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [newChat, setNewChat] = useState({ name: "", isPrivate: false, departmentId: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

          if (!profileData?.is_super_admin) {
            setLoading(false);
            return;
          }

          const { data: companiesData } = await supabase
            .from("companies")
            .select("*")
            .order("created_at", { ascending: false });
          if (!mounted) return;
          setCompanies(companiesData || []);

          if (companyIdParam) {
            const company = companiesData?.find(c => c.id === companyIdParam);
            if (company) setCurrentCompany(company);
          }
        }
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [companyIdParam]);

  useEffect(() => {
    if (!currentCompany) return;
    loadCompanyData(currentCompany.id);
  }, [currentCompany]);

  const loadCompanyData = async (companyId: string) => {
    const { data: membersData } = await supabase
      .from("company_members")
      .select("*, user_profiles(id, display_name, email, avatar_url)")
      .eq("company_id", companyId);
    setMembers(membersData || []);

    const { data: ticketsData } = await supabase
      .from("tickets")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setTickets(ticketsData || []);

    const { data: deptData } = await supabase
      .from("departments")
      .select("*")
      .eq("company_id", companyId);
    setDepartments(deptData || []);

    const { data: chatsData } = await supabase
      .from("chats")
      .select("*")
      .eq("company_id", companyId);
    setChats(chatsData || []);
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.slug) {
      setMessage("Preencha todos os campos");
      return;
    }
    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("companies")
        .insert({ name: newCompany.name, slug: newCompany.slug.toLowerCase() })
        .select()
        .single();

      if (error) throw error;

      if (profile) {
        await supabase.from("company_members").insert({
          company_id: data.id,
          user_profile_id: profile.id,
          role: "ADMIN"
        });

        await supabase.from("departments").insert({
          company_id: data.id,
          name: "Geral",
          slug: "geral"
        });

        await supabase.from("chats").insert([
          { company_id: data.id, name: "geral", is_private: false },
          { company_id: data.id, name: "anuncios", is_private: false },
          { company_id: data.id, name: "admin", is_private: true }
        ]);
      }

      setCompanies([data, ...companies]);
      setCurrentCompany(data);
      setShowCreateCompany(false);
      setNewCompany({ name: "", slug: "" });
      setMessage("Empresa criada com sucesso!");
    } catch (e: any) {
      setMessage("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChat = async () => {
    if (!currentCompany || !newChat.name) {
      setMessage("Preencha o nome do chat");
      return;
    }
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("chats")
        .insert({
          company_id: currentCompany.id,
          name: newChat.name.toLowerCase(),
          is_private: newChat.isPrivate,
          department_id: newChat.departmentId || null
        })
        .select()
        .single();

      if (error) throw error;

      setChats([...chats, data]);
      setShowCreateChat(false);
      setNewChat({ name: "", isPrivate: false, departmentId: "" });
      setMessage("Chat criado!");
    } catch (e: any) {
      setMessage("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("company_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      setMessage("Papel atualizado!");
    } catch (e: any) {
      setMessage("Erro: " + e.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Tem certeza que deseja remover este membro?")) return;
    try {
      const { error } = await supabase.from("company_members").delete().eq("id", memberId);
      if (error) throw error;
      setMembers(members.filter(m => m.id !== memberId));
      setMessage("Membro removido!");
    } catch (e: any) {
      setMessage("Erro: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!session || !profile?.is_super_admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoginForm />
      </div>
    );
  }

  const stats = {
    totalCompanies: companies.length,
    totalMembers: members.length,
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => t.status === "open").length,
    closedTickets: tickets.filter(t => t.status === "closed").length
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="text-muted-foreground hover:text-white">← Voltar</button>
            <h1 className="text-xl font-bold">Painel Admin</h1>
          </div>
          <select
            value={currentCompany?.id || ""}
            onChange={(e) => {
              const company = companies.find(c => c.id === e.target.value);
              setCurrentCompany(company || null);
            }}
            className="bg-muted border border-border rounded px-3 py-1.5 text-sm"
          >
            <option value="">Selecione uma empresa</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
          {["overview", "companies", "members", "chats", "tickets", "reports"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${
                activeTab === tab ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-white hover:bg-muted"
              }`}
            >
              {tab === "overview" && "Visão Geral"}
              {tab === "companies" && "Empresas"}
              {tab === "members" && "Membros"}
              {tab === "chats" && "Chats"}
              {tab === "tickets" && "Chamados"}
              {tab === "reports" && "Relatórios"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        {message && (
          <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 rounded text-sm">{message}</div>
        )}

        {activeTab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <p className="text-muted-foreground text-sm">Empresas</p>
              <p className="text-3xl font-bold">{stats.totalCompanies}</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <p className="text-muted-foreground text-sm">Membros</p>
              <p className="text-3xl font-bold">{stats.totalMembers}</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <p className="text-muted-foreground text-sm">Total Tickets</p>
              <p className="text-3xl font-bold">{stats.totalTickets}</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <p className="text-muted-foreground text-sm">Abertos</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.openTickets}</p>
            </div>
          </div>
        )}

        {activeTab === "companies" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Empresas</h2>
              <button
                onClick={() => setShowCreateCompany(!showCreateCompany)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
              >
                + Nova Empresa
              </button>
            </div>

            {showCreateCompany && (
              <div className="bg-card rounded-lg p-6 border border-border mb-4">
                <h3 className="font-semibold mb-4">Criar Nova Empresa</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="Nome da empresa"
                    className="bg-muted border border-border rounded px-4 py-2"
                  />
                  <input
                    value={newCompany.slug}
                    onChange={(e) => setNewCompany({ ...newCompany, slug: e.target.value })}
                    placeholder="Código (slug)"
                    className="bg-muted border border-border rounded px-4 py-2"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleCreateCompany}
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Criando..." : "Criar"}
                  </button>
                  <button
                    onClick={() => setShowCreateCompany(false)}
                    className="px-4 py-2 bg-muted text-white rounded hover:bg-muted/80"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(company => (
                <div
                  key={company.id}
                  className={`bg-card rounded-lg p-4 border cursor-pointer transition ${
                    currentCompany?.id === company.id ? "border-emerald-500" : "border-border hover:border-muted"
                  }`}
                  onClick={() => setCurrentCompany(company)}
                >
                  <h3 className="font-semibold">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">@{company.slug}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Criado em {new Date(company.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "members" && currentCompany && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Membros - {currentCompany.name}</h2>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Membro</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Papel</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-t border-border">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-sm">
                            {member.user_profiles?.display_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          {member.user_profiles?.display_name || "Unknown"}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{member.user_profiles?.email || "-"}</td>
                      <td className="p-3">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                          className="bg-muted border border-border rounded px-2 py-1 text-sm"
                        >
                          <option value="MEMBER">Membro</option>
                          <option value="MANAGER">Gerente</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Nenhum membro encontrado</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "members" && !currentCompany && (
          <div className="text-center py-12 text-muted-foreground">Selecione uma empresa para gerenciar membros</div>
        )}

        {activeTab === "chats" && currentCompany && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Chats - {currentCompany.name}</h2>
              <button
                onClick={() => setShowCreateChat(!showCreateChat)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
              >
                + Novo Chat
              </button>
            </div>

            {showCreateChat && (
              <div className="bg-card rounded-lg p-6 border border-border mb-4">
                <h3 className="font-semibold mb-4">Criar Novo Chat</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={newChat.name}
                    onChange={(e) => setNewChat({ ...newChat, name: e.target.value })}
                    placeholder="Nome do chat"
                    className="bg-muted border border-border rounded px-4 py-2"
                  />
                  <select
                    value={newChat.departmentId}
                    onChange={(e) => setNewChat({ ...newChat, departmentId: e.target.value })}
                    className="bg-muted border border-border rounded px-4 py-2"
                  >
                    <option value="">Sem departamento</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    checked={newChat.isPrivate}
                    onChange={(e) => setNewChat({ ...newChat, isPrivate: e.target.checked })}
                    className="rounded"
                  />
                  <span>Chat privado (apenas usuários selecionados)</span>
                </label>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleCreateChat}
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Criando..." : "Criar"}
                  </button>
                  <button
                    onClick={() => setShowCreateChat(false)}
                    className="px-4 py-2 bg-muted text-white rounded hover:bg-muted/80"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chats.map(chat => (
                <div key={chat.id} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2">
                    {chat.is_private ? <span className="text-yellow-400">🔒</span> : <span className="text-muted-foreground">#</span>}
                    <h3 className="font-semibold">{chat.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{chat.is_private ? "Privado" : "Público"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "chats" && !currentCompany && (
          <div className="text-center py-12 text-muted-foreground">Selecione uma empresa para gerenciar chats</div>
        )}

        {activeTab === "tickets" && currentCompany && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Chamados - {currentCompany.name}</h2>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Título</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Prioridade</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="border-t border-border">
                      <td className="p-3">{ticket.title}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          ticket.status === "open" ? "bg-yellow-900 text-yellow-300" :
                          ticket.status === "closed" ? "bg-green-900 text-green-300" : "bg-emerald-900 text-emerald-300"
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          ticket.priority === "high" ? "bg-red-900 text-red-300" :
                          ticket.priority === "medium" ? "bg-yellow-900 text-yellow-300" : "bg-green-900 text-green-300"
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-sm">
                        {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tickets.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Nenhum chamado encontrado</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tickets" && !currentCompany && (
          <div className="text-center py-12 text-muted-foreground">Selecione uma empresa para ver chamados</div>
        )}

        {activeTab === "reports" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Relatórios</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold mb-4">Tickets por Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Abertos</span>
                    <span className="font-semibold text-yellow-400">{stats.openTickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fechados</span>
                    <span className="font-semibold text-green-400">{stats.closedTickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{stats.totalTickets}</span>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold mb-4">Empresas Cadastradas</h3>
                <p className="text-4xl font-bold">{stats.totalCompanies}</p>
                <p className="text-muted-foreground text-sm mt-2">Total de empresas no sistema</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}

