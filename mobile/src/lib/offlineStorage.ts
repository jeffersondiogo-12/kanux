// Offline storage for mobile app using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  MESSAGES: 'offline_messages',
  TICKETS: 'offline_tickets',
  PENDING_MESSAGES: 'pending_messages',
  PENDING_TICKETS: 'pending_tickets',
  LAST_SYNC: 'last_sync',
  USER_COMPANY: 'user_company',
};

// Messages storage
export async function saveMessagesOffline(chatId: string, messages: any[]): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.MESSAGES}_${chatId}`;
    await AsyncStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages offline:', error);
  }
}

export async function getOfflineMessages(chatId: string): Promise<any[]> {
  try {
    const key = `${STORAGE_KEYS.MESSAGES}_${chatId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting offline messages:', error);
    return [];
  }
}

// Tickets storage
export async function saveTicketsOffline(tickets: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  } catch (error) {
    console.error('Error saving tickets offline:', error);
  }
}

export async function getOfflineTickets(): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TICKETS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting offline tickets:', error);
    return [];
  }
}

// Pending operations (for sync when online)
export async function addPendingMessage(message: any): Promise<void> {
  try {
    const pending = await getPendingMessages();
    pending.push(message);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify(pending));
  } catch (error) {
    console.error('Error adding pending message:', error);
  }
}

export async function getPendingMessages(): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_MESSAGES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pending messages:', error);
    return [];
  }
}

export async function clearPendingMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_MESSAGES);
  } catch (error) {
    console.error('Error clearing pending messages:', error);
  }
}

export async function addPendingTicket(ticket: any): Promise<void> {
  try {
    const pending = await getPendingTickets();
    pending.push(ticket);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_TICKETS, JSON.stringify(pending));
  } catch (error) {
    console.error('Error adding pending ticket:', error);
  }
}

export async function getPendingTickets(): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_TICKETS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pending tickets:', error);
    return [];
  }
}

export async function clearPendingTickets(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_TICKETS);
  } catch (error) {
    console.error('Error clearing pending tickets:', error);
  }
}

// User company storage
export async function saveUserCompany(companyId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_COMPANY, companyId);
  } catch (error) {
    console.error('Error saving user company:', error);
  }
}

export async function getUserCompany(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_COMPANY);
  } catch (error) {
    console.error('Error getting user company:', error);
    return null;
  }
}

// Last sync timestamp
export async function updateLastSync(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Error updating last sync:', error);
  }
}

export async function getLastSync(): Promise<Date | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return data ? new Date(data) : null;
  } catch (error) {
    console.error('Error getting last sync:', error);
    return null;
  }
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}

