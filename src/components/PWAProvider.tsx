"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker, setupNetworkListeners, isOnline } from "@/lib/pwa";
import { offlineStorage } from "@/lib/offlineStorage";
import { supabase } from "@/lib/supabaseClient";

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init().catch(console.error);

    // Register service worker
    registerServiceWorker();

    // Setup network listeners
    const cleanup = setupNetworkListeners(
      // Online handler
      async () => {
        setOnline(true);
        await syncPendingData();
      },
      // Offline handler
      () => {
        setOnline(false);
      }
    );

    // Check initial state
    setOnline(isOnline());

    // Listen for sync events
    const handleSync = () => syncPendingData();
    window.addEventListener("sync-messages", handleSync);

    return () => {
      cleanup();
      window.removeEventListener("sync-messages", handleSync);
    };
  }, []);

  const syncPendingData = async () => {
    if (syncing) return;
    
    try {
      setSyncing(true);
      const result = await offlineStorage.syncAll(supabase);
      
      if (result.messages > 0 || result.tickets > 0) {
        console.log(`Sincronizado: ${result.messages} mensagens, ${result.tickets} tickets`);
      }
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      {children}
      
      {/* Offline indicator */}
      {!online && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          Offline - Dados serão sincronizados quando conectar
        </div>
      )}

      {/* Syncing indicator */}
      {online && syncing && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sincronizando dados...
        </div>
      )}
    </>
  );
}
