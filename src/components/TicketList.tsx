"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TicketList({ companyId }: { companyId?: string | null }) {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(()=>{ if(!companyId) return; (async ()=>{ const { data } = await supabase.from('tickets').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50); setTickets(data ?? []); })() }, [companyId]);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-3">Chamados</h3>
      <ul className="space-y-2">
        {tickets.map(t => (
          <li key={t.id} className="border rounded p-2">
            <div className="text-sm text-gray-500">{t.number} • {t.priority}</div>
            <div className="font-medium">{t.title}</div>
            <div className="text-sm text-gray-600">{t.status}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
