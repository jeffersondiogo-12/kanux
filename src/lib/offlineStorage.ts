// IndexedDB Service for offline message storage
// Armazena mensagens localmente para funcionar offline

const DB_NAME = 'kanux-offline';
const DB_VERSION = 1;

interface OfflineMessage {
  id: string;
  chat_id: string;
  content: string;
  created_at: string;
  pending: boolean;
  synced: boolean;
}

interface OfflineTicket {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  company_id: string;
  created_at: string;
  pending: boolean;
  synced: boolean;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('chat_id', 'chat_id', { unique: false });
          messagesStore.createIndex('pending', 'pending', { unique: false });
          messagesStore.createIndex('synced', 'synced', { unique: false });
        }

        // Tickets store
        if (!db.objectStoreNames.contains('tickets')) {
          const ticketsStore = db.createObjectStore('tickets', { keyPath: 'id' });
          ticketsStore.createIndex('company_id', 'company_id', { unique: false });
          ticketsStore.createIndex('pending', 'pending', { unique: false });
        }

        // Pending operations store
        if (!db.objectStoreNames.contains('pending_ops')) {
          db.createObjectStore('pending_ops', { keyPath: 'id', autoIncrement: true });
        }

        // Cache for companies and profiles
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  // Messages
  async saveMessage(message: OfflineMessage): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['messages'], 'readwrite');
      const store = tx.objectStore('messages');
      store.put(message);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingMessages(): Promise<OfflineMessage[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['messages'], 'readonly');
      const store = tx.objectStore('messages');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const all = request.result as OfflineMessage[];
        resolve(all.filter(m => m.pending === true));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getMessagesByChat(chatId: string): Promise<OfflineMessage[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['messages'], 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('chat_id');
      const request = index.getAll(chatId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markMessageSynced(messageId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['messages'], 'readwrite');
      const store = tx.objectStore('messages');
      
      store.get(messageId).onsuccess = () => {
        const message = (tx as any).result as OfflineMessage;
        if (message) {
          message.synced = true;
          message.pending = false;
          store.put(message);
        }
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Tickets
  async saveTicket(ticket: OfflineTicket): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['tickets'], 'readwrite');
      const store = tx.objectStore('tickets');
      store.put(ticket);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingTickets(): Promise<OfflineTicket[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['tickets'], 'readonly');
      const store = tx.objectStore('tickets');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const all = request.result as OfflineTicket[];
        resolve(all.filter(t => t.pending === true));
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cache
  async setCache(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cache'], 'readwrite');
      const store = tx.objectStore('cache');
      store.put({ key, value, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCache(key: string): Promise<any | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cache'], 'readonly');
      const store = tx.objectStore('cache');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        // Cache expires after 1 hour
        if (result && Date.now() - result.timestamp < 3600000) {
          resolve(result.value);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync all pending data
  async syncAll(supabase: any): Promise<{ messages: number; tickets: number }> {
    const results = { messages: 0, tickets: 0 };
    
    try {
      // Sync pending messages
      const pendingMessages = await this.getPendingMessages();
      for (const msg of pendingMessages) {
        try {
          await supabase.from('messages').insert({
            chat_id: msg.chat_id,
            content: msg.content,
            created_at: msg.created_at,
          });
          await this.markMessageSynced(msg.id);
          results.messages++;
        } catch (e) {
          console.error('Failed to sync message:', e);
        }
      }

      // Sync pending tickets
      const pendingTickets = await this.getPendingTickets();
      for (const ticket of pendingTickets) {
        try {
          await supabase.from('tickets').insert({
            company_id: ticket.company_id,
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            status: ticket.status,
          });
          results.tickets++;
        } catch (e) {
          console.error('Failed to sync ticket:', e);
        }
      }
    } catch (e) {
      console.error('Sync failed:', e);
    }
    
    return results;
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    const stores = ['messages', 'tickets', 'pending_ops', 'cache'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }
}

export const offlineStorage = new OfflineStorage();
export type { OfflineMessage, OfflineTicket };
