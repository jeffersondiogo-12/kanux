"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileCard(){
  const [profile, setProfile] = useState<any>(null);

  useEffect(()=>{
    (async ()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return;
      const { data } = await supabase.from('user_profiles').select('*').eq('auth_user_id', user.id).single();
      setProfile(data);
    })();
  },[]);

  if(!profile) return <div className="p-4">Sem perfil</div>
  return (
    <div className="p-4">
      <div className="font-semibold">{profile.display_name ?? profile.email}</div>
      <div className="text-sm text-gray-600">{profile.email}</div>
    </div>
  )
}
