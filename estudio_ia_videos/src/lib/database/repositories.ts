/**
 * Database Repositories
 * Data access layer for database operations
 * Uses in-memory storage for sessions and notifications
 * Note: In production, these should be stored in a proper database
 */

import { v4 as uuidv4 } from 'uuid';

// Session type definition
export interface SessionRecord {
  id: string;
  user_id: string;
  token: string;
  device_info?: string;
  ip_address?: string;
  expires_at: string;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

// Notification type definition
export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

// In-memory storage
const sessionsStore = new Map<string, SessionRecord>();
const notificationsStore = new Map<string, NotificationRecord>();

/**
 * Sessions repository
 */
export const sessionsRepository = {
  async create(userId: string, data: { deviceInfo?: string; ipAddress?: string; expiresAt?: Date }): Promise<SessionRecord> {
    const token = uuidv4();
    const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const session: SessionRecord = {
      id,
      user_id: userId,
      token,
      device_info: data.deviceInfo,
      ip_address: data.ipAddress,
      expires_at: expiresAt.toISOString(),
      created_at: now,
    };
    
    sessionsStore.set(token, session);
    return session;
  },
  
  async findByToken(token: string): Promise<SessionRecord | null> {
    return sessionsStore.get(token) || null;
  },
  
  async findByUserId(userId: string): Promise<SessionRecord[]> {
    const sessions: SessionRecord[] = [];
    sessionsStore.forEach((session) => {
      if (session.user_id === userId) {
        sessions.push(session);
      }
    });
    return sessions;
  },
  
  async delete(id: string): Promise<void> {
    sessionsStore.forEach((session, token) => {
      if (session.id === id) {
        sessionsStore.delete(token);
      }
    });
  },
  
  async deleteByToken(token: string): Promise<void> {
    sessionsStore.delete(token);
  },
  
  async deleteByUserId(userId: string): Promise<void> {
    sessionsStore.forEach((session, token) => {
      if (session.user_id === userId) {
        sessionsStore.delete(token);
      }
    });
  },
  
  async updateExpiration(token: string, expiresAt: Date): Promise<void> {
    const session = sessionsStore.get(token);
    if (session) {
      session.expires_at = expiresAt.toISOString();
      session.updated_at = new Date().toISOString();
    }
  },
  
  async deleteExpired(): Promise<void> {
    const now = new Date();
    sessionsStore.forEach((session, token) => {
      if (new Date(session.expires_at) < now) {
        sessionsStore.delete(token);
      }
    });
  },
};

/**
 * Notifications repository - in-memory storage
 */
export const notificationsRepository = {
  async create(userId: string, notification: { 
    type: string; 
    title: string; 
    message: string; 
    data?: Record<string, unknown>;
  }): Promise<NotificationRecord> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const record: NotificationRecord = {
      id,
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      is_read: false,
      created_at: now,
    };
    
    notificationsStore.set(id, record);
    return record;
  },
  
  async findByUserId(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<NotificationRecord[]> {
    const notifications: NotificationRecord[] = [];
    
    notificationsStore.forEach((notification) => {
      if (notification.user_id === userId) {
        if (options?.unreadOnly && notification.is_read) {
          return;
        }
        notifications.push(notification);
      }
    });
    
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (options?.limit) {
      return notifications.slice(0, options.limit);
    }
    
    return notifications;
  },
  
  async markAsRead(id: string): Promise<void> {
    const notification = notificationsStore.get(id);
    if (notification) {
      notification.is_read = true;
      notification.read_at = new Date().toISOString();
    }
  },
  
  async markAllAsRead(userId: string): Promise<void> {
    const now = new Date().toISOString();
    notificationsStore.forEach((notification) => {
      if (notification.user_id === userId && !notification.is_read) {
        notification.is_read = true;
        notification.read_at = now;
      }
    });
  },
  
  async delete(id: string): Promise<void> {
    notificationsStore.delete(id);
  },
  
  async deleteByUserId(userId: string): Promise<void> {
    notificationsStore.forEach((notification, id) => {
      if (notification.user_id === userId) {
        notificationsStore.delete(id);
      }
    });
  },
  
  async getUnreadCount(userId: string): Promise<number> {
    let count = 0;
    notificationsStore.forEach((notification) => {
      if (notification.user_id === userId && !notification.is_read) {
        count++;
      }
    });
    return count;
  },
};

export default {
  sessions: sessionsRepository,
  notifications: notificationsRepository,
};
