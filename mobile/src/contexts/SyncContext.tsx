import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// @ts-ignore - netinfo types issue with expo
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import { 
  getPendingMessages, 
  clearPendingMessages,
  getOfflineMessages,
  saveMessagesOffline,
  addPendingMessage 
} from '../lib/offlineStorage';
import { supabase, sendMessage as sendSupabaseMessage } from '../lib/supabase';

interface SyncContextType {
  isSyncing: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isOnline, profile } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Check pending count periodically
  useEffect(() => {
    const checkPending = async () => {
      const pending = await getPendingMessages();
      setPendingCount(pending.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && profile && pendingCount > 0) {
      syncNow();
    }
  }, [isOnline, pendingCount]);

  const syncNow = async () => {
    if (!isOnline || isSyncing || !profile) return;
    
    setIsSyncing(true);
    try {
      const pending = await getPendingMessages();
      
      for (const message of pending) {
        try {
          await sendSupabaseMessage(message.chatId, message.content);
        } catch (error) {
          console.error('Error syncing message:', error);
        }
      }
      
      await clearPendingMessages();
      setPendingCount(0);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider value={{ isSyncing, pendingCount, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

// Hook to save messages offline and sync when online
export function useOfflineMessages(chatId: string) {
  const { isOnline, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        // Fetch from Supabase
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
          .limit(50);
        
        const onlineMessages = data || [];
        setMessages(onlineMessages);
        
        // Save offline copy
        await saveMessagesOffline(chatId, onlineMessages);
      } else {
        // Load from offline storage
        const offlineMessages = await getOfflineMessages(chatId);
        setMessages(offlineMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Fallback to offline
      const offlineMessages = await getOfflineMessages(chatId);
      setMessages(offlineMessages);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (isOnline) {
      // Send directly
      const message = await sendSupabaseMessage(chatId, content);
      if (message) {
        setMessages(prev => [...prev, message]);
      }
      return message;
    } else {
      // Save locally and queue for sync
      const tempMessage = {
        id: `temp_${Date.now()}`,
        chat_id: chatId,
        user_profile_id: profile?.id,
        content,
        attachments: [],
        created_at: new Date().toISOString(),
        pending: true,
      };
      
      setMessages(prev => [...prev, tempMessage]);
      await addPendingMessage({ chatId, content });
      return tempMessage;
    }
  };

  useEffect(() => {
    loadMessages();
  }, [chatId, isOnline]);

  return { messages, loading, sendMessage, refresh: loadMessages };
}

