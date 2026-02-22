import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// @ts-ignore - netinfo types issue with expo
import NetInfo from '@react-native-community/netinfo';
import { Session, User } from '@supabase/supabase-js';
import { supabase, getUserProfile, Profile } from '../lib/supabase';
import { saveUserCompany, getUserCompany } from '../lib/offlineStorage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isOnline: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getUserProfile(user.id);
    setProfile(profileData);
    
    // Save company association offline
    if (profileData) {
      // Get user's first company and save it
      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_profile_id', profileData.id)
        .limit(1)
        .single();
        
      if (memberData?.company_id) {
        await saveUserCompany(memberData.company_id);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    // Check network status
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsOnline(state.isConnected ?? false);
    });

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        getUserProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          
          // Save company association offline
          if (profileData) {
            supabase
              .from('company_members')
              .select('company_id')
              .eq('user_profile_id', profileData.id)
              .limit(1)
              .single()
              .then(({ data: memberData }) => {
                if (memberData?.company_id) {
                  saveUserCompany(memberData.company_id);
                }
              });
          }
          
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        getUserProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isOnline,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

