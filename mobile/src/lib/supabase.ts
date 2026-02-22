import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill';
import { ENV } from './env';

// Create Supabase client with React Native compatibility
export const supabase = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

// Types for the database schema
export type Profile = {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  company_number: number;
  created_by: string | null;
  created_at: string;
};

export type CompanyMember = {
  id: string;
  company_id: string;
  user_profile_id: string;
  role: 'MEMBER' | 'MANAGER' | 'ADMIN';
  joined_at: string;
};

export type Chat = {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  user_profile_id: string;
  content: string;
  attachments: any;
  created_at: string;
  updated_at: string;
};

export type Ticket = {
  id: string;
  number: string;
  company_id: string;
  department_id: string | null;
  creator_profile_id: string;
  assignee_profile_id: string | null;
  title: string;
  description: string | null;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  user_profile_id: string;
  content: string;
  created_at: string;
};

export type Department = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  created_at: string;
};

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// Helper to get user profile
export async function getUserProfile(userId?: string): Promise<Profile | null> {
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', uid)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

// Helper to get user's companies
export async function getUserCompanies(): Promise<Company[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return [];

  const { data, error } = await supabase
    .from('company_members')
    .select(`
      company_id,
      role,
      companies:company_id (
        id,
        name,
        slug,
        company_number,
        created_at
      )
    `)
    .eq('user_profile_id', profile.id);

  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }

  return data?.map((item: any) => item.companies).flat() || [];
}

// Helper to get company members
export async function getCompanyMembers(companyId: string): Promise<(Profile & { role: string })[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select(`
      role,
      user_profiles!inner (
        id,
        auth_user_id,
        display_name,
        email,
        avatar_url,
        is_super_admin,
        created_at
      )
    `)
    .eq('company_id', companyId);

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  return data?.map((item: any) => ({
    ...item.user_profiles,
    role: item.role,
  })) || [];
}

// Helper to get chats for a company
export async function getCompanyChats(companyId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  return data || [];
}

// Helper to get messages for a chat
export async function getChatMessages(chatId: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (data || []).reverse();
}

// Helper to send a message
export async function sendMessage(chatId: string, content: string): Promise<Message | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getUserProfile(user.id);
  if (!profile) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      user_profile_id: profile.id,
      content,
      attachments: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
}

// Helper to get tickets for a company
export async function getCompanyTickets(companyId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }

  return data || [];
}

// Helper to create a ticket
export async function createTicket(
  companyId: string,
  title: string,
  description: string,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
  departmentId?: string
): Promise<Ticket | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getUserProfile(user.id);
  if (!profile) return null;

  // Generate ticket number
  const { data: countData } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const ticketNumber = `TKT-${String((countData?.length || 0) + 1).padStart(5, '0')}`;

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      company_id: companyId,
      department_id: departmentId || null,
      creator_profile_id: profile.id,
      title,
      description,
      priority,
      status: 'OPEN',
      number: ticketNumber,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating ticket:', error);
    return null;
  }

  return data;
}

// Helper to update ticket status
export async function updateTicketStatus(
  ticketId: string,
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'
): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'RESOLVED' ? { resolved_at: new Date().toISOString() } : {}),
    })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) {
    console.error('Error updating ticket:', error);
    return null;
  }

  return data;
}

// Helper to get ticket comments
export async function getTicketComments(ticketId: string): Promise<TicketComment[]> {
  const { data, error } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

// Helper to add ticket comment
export async function addTicketComment(ticketId: string, content: string): Promise<TicketComment | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getUserProfile(user.id);
  if (!profile) return null;

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      user_profile_id: profile.id,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }

  return data;
}

// Helper to sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
  }
}

