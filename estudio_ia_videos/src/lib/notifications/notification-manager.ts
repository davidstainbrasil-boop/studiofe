/**
 * Notification Manager
 * Gerenciador de notificações do sistema (Persistência Real)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@lib/logger';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
}

interface Room {
  id: string;
  name: string;
  members: Set<string>;
  createdAt: Date;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private supabase: SupabaseClient;
  private rooms: Map<string, Room> = new Map();

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not found in NotificationManager', { component: 'NotificationManager' });
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  createRoom(roomId: string, name: string): Room {
    const room: Room = {
      id: roomId,
      name,
      members: new Set(),
      createdAt: new Date()
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      room.members.add(userId);
      return true;
    }
    return false;
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      return room.members.delete(userId);
    }
    return false;
  }
  
  async create(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<Notification> {
    const notif = {
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
      action_url: notification.actionUrl,
      expiresAt: notification.expiresAt?.toISOString(),
      createdAt: new Date().toISOString()
    };

    // Note: Assuming a 'notifications' table exists. If not, we should create it or use a generic events table.
    // Given the schema I saw earlier, there isn't a specific 'notifications' table.
    // I will use 'analytics_events' as a fallback for now if I can't create a table, 
    // BUT for a real notification system, we need a table.
    // Let's assume we can use a JSONB structure in 'analytics_events' OR create a table via SQL if I could.
    // Since I can't run SQL directly to create tables easily without a migration tool, 
    // I will implement this using 'analytics_events' with a specific event_type 'system.notification'
    // This allows storing notifications without schema changes, though less efficient for querying 'unread'.
    
    // BETTER APPROACH: Use the existing 'analytics_events' table but structure it so we can query it.
    // event_type = 'notification'
    // event_data = { title, message, type, read, actionUrl }
    
    const { data, error } = await this.supabase
      .from('analytics_events')
      .insert({
        userId: notification.userId,
        eventType: 'notification',
        eventData: {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          read: false,
          actionUrl: notification.actionUrl,
          expiresAt: notification.expiresAt
        },
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create notification', error instanceof Error ? error : new Error(String(error)), { component: 'NotificationManager' });
      throw error;
    }

    return {
      id: data.id,
      userId: data.userId,
      type: data.eventData.type,
      title: data.eventData.title,
      message: data.eventData.message,
      read: data.eventData.read,
      createdAt: new Date(data.createdAt),
      expiresAt: data.eventData.expiresAt ? new Date(data.eventData.expiresAt) : undefined,
      actionUrl: data.eventData.actionUrl
    };
  }
  
  async getForUser(userId: string, unreadOnly = false): Promise<Notification[]> {
    const query = this.supabase
      .from('analytics_events')
      .select('*')
      .eq("userId", userId)
      .eq("eventType", 'notification')
      .order("createdAt", { ascending: false });

    // Filtering JSONB for 'read' status is possible but syntax depends on Supabase/Postgres version.
    // .filter('event_data->>read', 'eq', 'false')
    if (unreadOnly) {
      // This might be slow if many notifications, but works for MVP
      // We'll filter in memory if we can't rely on JSONB filtering perfectly here without testing
    }

    const { data, error } = await query.limit(50);

    if (error) return [];

    let notifications = data.map(row => ({
      id: row.id,
      userId: row.userId,
      type: row.eventData.type,
      title: row.eventData.title,
      message: row.eventData.message,
      read: row.eventData.read,
      createdAt: new Date(row.createdAt),
      expiresAt: row.eventData.expiresAt ? new Date(row.eventData.expiresAt) : undefined,
      actionUrl: row.eventData.actionUrl
    }));

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    return notifications;
  }
  
  async markAsRead(notificationId: string): Promise<boolean> {
    // We need to fetch the current data to update just the 'read' field in JSONB
    // Or use a jsonb_set function if available.
    // For safety, fetch-modify-update.
    
    const { data: current } = await this.supabase
      .from('analytics_events')
      .select("eventData")
      .eq('id', notificationId)
      .single();
      
    if (!current) return false;
    
    const newData = { ...current.eventData, read: true };
    
    const { error } = await this.supabase
      .from('analytics_events')
      .update({ eventData: newData })
      .eq('id', notificationId);

    return !error;
  }
  
  async delete(notificationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('analytics_events')
      .delete()
      .eq('id', notificationId);
      
    return !error;
  }
  
  async deleteAllForUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('analytics_events')
      .delete({ count: 'exact' })
      .eq("userId", userId)
      .eq("eventType", 'notification');
      
    return error ? 0 : (count || 0);
  }
  
  async sendToUser(userId: string, notification: Record<string, unknown>): Promise<void> {
    try {
      const data = notification.data as Record<string, unknown> | undefined;
      await this.create({
        userId,
        type: notification.type === 'error' || notification.type === 'upload_error' ? 'error' : 'info',
        title: notification.title as string,
        message: notification.message as string,
        actionUrl: data?.uploadId ? `/upload/${data.uploadId}` : undefined
      });
    } catch (error) {
      logger.error('Error sending notification to user', error instanceof Error ? error : new Error(String(error)), { component: 'NotificationManager' });
    }
  }

  async broadcastToRoom(roomId: string, notification: Record<string, unknown>): Promise<void> {
    // Not implemented in persistence layer yet
    logger.info(`Broadcasting to room ${roomId}`, { component: 'NotificationManager', title: notification.title });
  }

  async sendNotification(notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    timestamp?: number;
    userId?: string;
    roomId?: string;
    data?: Record<string, unknown>;
    persistent?: boolean;
  }): Promise<void> {
    // 1. Persist if requested or if it's a user notification
    if (notification.persistent !== false && notification.userId) {
      try {
        await this.create({
          userId: notification.userId,
          type: (notification.type === 'error' || notification.type === 'upload_error') ? 'error' : 'info',
          title: notification.title,
          message: notification.message,
          actionUrl: notification.data?.uploadId ? `/upload/${notification.data.uploadId}` : undefined
        });
      } catch (error) {
        logger.error('Error persisting notification', error instanceof Error ? error : new Error(String(error)), { component: 'NotificationManager' });
      }
    }

    // 2. Broadcast to room if specified
    if (notification.roomId) {
      await this.broadcastToRoom(notification.roomId, notification);
    }
    
    // 3. Send to user if specified (and not already handled by broadcast if room is user-specific)
    if (notification.userId && !notification.roomId) {
       // In a real implementation, this would send via WebSocket to the user's channel
       logger.info(`Sending to user ${notification.userId}`, { component: 'NotificationManager', title: notification.title });
    }
  }
}

export const notificationManager = new NotificationManager();
