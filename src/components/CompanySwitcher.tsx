"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function CompanySwitcher({ currentCompanyId }: { currentCompanyId?: string }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = (sessionData as any)?.session;
        if (!mounted) return;
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single();
          setProfile(profileData);

          const { data: companiesData } = await supabase
            .from('company_members')
            .select('companies(*)')
            .eq('user_profile_id', profileData?.id);
          
          const uniqueCompanies = [
            ...new Map(
              (companiesData || []).map((cm: any) => [cm.companies.id, cm.companies])
            ).values(),
          ] as any[];
          
          if (!mounted) return;
          setCompanies(uniqueCompanies);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false };
  }, []);

  const current = companies.find(c => c.id === currentCompanyId) || companies[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm font-medium"
      >
        {current?.name || 'Empresa'}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded shadow-lg border border-gray-200 dark:border-slate-700 z-50">
          {companies.map(c => (
            <Link
              key={c.id}
              href={`/?companyId=${c.id}`}
              className={`block px-3 py-2 text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900 ${
                c.id === currentCompanyId ? 'bg-emerald-50 dark:bg-emerald-950 font-semibold' : ''
              }`}
              onClick={() => setOpen(false)}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
