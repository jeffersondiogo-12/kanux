"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LoginForm from "@/components/LoginForm";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  created_by: string;
  company_id: string;
}

interface Comment {
  id: string;
  content?: string;
  text?: string;
  created_at: string;
  user_profile?: any;
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const s = (sessionData as any)?.session;
        if (!mounted) return;
        setSession(s);

        if (!ticketId) return;

        // Fetch ticket
        const { data: ticketData } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", ticketId)
          .single();
        if (mounted) setTicket(ticketData);

        // Fetch comments
        const { data: commentsData } = await supabase
          .from("ticket_comments")
          .select(
            "id, content, created_at, user_profile:user_profile_id(display_name)"
          )
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });
        if (mounted) setComments((commentsData as any) || []);

        setLoading(false);
      } catch (e) {
        console.error("Error:", e);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [ticketId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert("Comentário não pode estar vazio");
      return;
    }

    setSavingComment(true);
    try {
      // Get user profile ID
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!profile) {
        alert("Perfil não encontrado");
        setSavingComment(false);
        return;
      }

      const { data, error } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: ticketId,
          user_profile_id: profile.id,
          content: newComment,
        })
        .select("id, content, created_at, user_profile:user_profile_id(display_name)");

      if (error) {
        alert("Erro ao adicionar comentário: " + error.message);
      } else if (data) {
        setComments([...comments, ...data]);
        setNewComment("");
      }
    } catch (e: any) {
      alert("Erro: " + e.message);
    } finally {
      setSavingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);

      if (error) {
        alert("Erro: " + error.message);
      } else {
        setTicket({ ...ticket!, status: newStatus });
        setEditingStatus(null);
      }
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ priority: newPriority })
        .eq("id", ticketId);

      if (error) {
        alert("Erro: " + error.message);
      } else {
        setTicket({ ...ticket!, priority: newPriority });
        setEditingPriority(null);
      }
    } catch (e: any) {
      alert("Erro: " + e.message);
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <LoginForm />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Ticket não encontrado
          </p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      case "low":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "in_progress":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
      case "closed":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/tickets"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Voltar para Tickets
          </a>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            {ticket.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {ticket.description}
          </p>
        </div>

        {/* Status & Priority */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </p>
              {editingStatus ? (
                <select
                  value={editingStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="open">Aberto</option>
                  <option value="in_progress">Em Progresso</option>
                  <option value="closed">Fechado</option>
                </select>
              ) : (
                <button
                  onClick={() => setEditingStatus(ticket.status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${getStatusColor(
                    ticket.status
                  )}`}
                >
                  {ticket.status === "open"
                    ? "Aberto"
                    : ticket.status === "in_progress"
                      ? "Em Progresso"
                      : "Fechado"}
                </button>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Prioridade
              </p>
              {editingPriority ? (
                <select
                  value={editingPriority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className="px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              ) : (
                <button
                  onClick={() => setEditingPriority(ticket.priority)}
                  className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${getPriorityColor(
                    ticket.priority
                  )}`}
                >
                  {ticket.priority === "high"
                    ? "Alta"
                    : ticket.priority === "medium"
                      ? "Média"
                      : "Baixa"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
            Comentários ({comments.length})
          </h2>

          {/* Add Comment */}
          <div className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Deixe um comentário..."
              rows={4}
              className="w-full px-4 py-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <button
              onClick={handleAddComment}
              disabled={savingComment}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {savingComment ? "Salvando..." : "Comentar"}
            </button>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400 text-center py-8">
              Nenhum comentário ainda
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-slate-50 dark:bg-slate-700 rounded p-4"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    {(comment.user_profile as any)?.display_name ||
                      "Anônimo"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {new Date(comment.created_at).toLocaleDateString("pt-BR")}{" "}
                    {new Date(comment.created_at).toLocaleTimeString("pt-BR")}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    {(comment as any).content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
