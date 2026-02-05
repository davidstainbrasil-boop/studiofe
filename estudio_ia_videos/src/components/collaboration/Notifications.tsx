/**
 * 🔔 Real-Time Notification System
 * Handles collaborative events, notifications, and alerts
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Users, MessageCircle, AlertTriangle } from 'lucide-react';
import { logger } from '@lib/logger';

export interface Notification {
  id: string;
  type: 'user_joined' | 'user_left' | 'edit_conflict' | 'slide_updated' | 'comment_added' | 'render_complete' | 'error';
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  timestamp: Date;
  read: boolean;
  projectId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface UseNotificationsOptions {
  maxNotifications?: number;
  autoClearAfter?: number; // milliseconds
  enableSound?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    maxNotifications = 50,
    autoClearAfter = 30000, // 30 seconds
    enableSound = true
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Add new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    // Auto-clear notification
    if (autoClearAfter > 0) {
      const timeout = setTimeout(() => {
        removeNotification(newNotification.id);
      }, autoClearAfter);

      timeoutRef.current.set(newNotification.id, timeout);
    }

    // Play sound if enabled
    if (enableSound && typeof window !== 'undefined') {
      playNotificationSound(notification.type);
    }

    logger.info('Notification added', {
      id: newNotification.id,
      type: notification.type,
      title: notification.title,
      component: 'useNotifications'
    });
  }, [maxNotifications, autoClearAfter, enableSound]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Clear timeout
    const timeout = timeoutRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRef.current.delete(id);
    }

    logger.debug('Notification removed', {
      id,
      component: 'useNotifications'
    });
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    
    // Clear all timeouts
    timeoutRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutRef.current.clear();

    logger.info('All notifications cleared', {
      component: 'useNotifications'
    });
  }, []);

  // Update unread count
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutRef.current.clear();
    };
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll
  };
}

// Notification sounds
function playNotificationSound(type: Notification['type']) {
  if (!window.Audio) return;

  try {
    let audioFile = '';
    switch (type) {
      case 'user_joined':
      case 'user_left':
        audioFile = '/sounds/notification-soft.mp3';
        break;
      case 'edit_conflict':
        audioFile = '/sounds/alert.mp3';
        break;
      case 'render_complete':
        audioFile = '/sounds/success.mp3';
        break;
      case 'error':
        audioFile = '/sounds/error.mp3';
        break;
      default:
        audioFile = '/sounds/notification.mp3';
    }

    const audio = new Audio(audioFile);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore errors (user might not have sound enabled)
    });

  } catch (error) {
    // Ignore sound errors
  }
}

// Notification Component
interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onRead, onRemove }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'user_joined':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'user_left':
        return <Users className="w-4 h-4 text-gray-500" />;
      case 'edit_conflict':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'comment_added':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'render_complete':
        return <Bell className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'edit_conflict':
        return 'bg-yellow-50 border-yellow-200';
      case 'render_complete':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div 
      className={`notification-item border rounded-lg p-3 mb-2 transition-all ${getTypeStyles()} ${
        notification.read ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {notification.title}
            </h4>
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              {formatTime(notification.timestamp)}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mt-1">
            {notification.message}
          </p>
          
          {notification.userName && (
            <div className="flex items-center mt-2 text-xs text-gray-500">
              {notification.userAvatar && (
                <img 
                  src={notification.userAvatar} 
                  alt={notification.userName}
                  className="w-4 h-4 rounded-full mr-1"
                />
              )}
              {notification.userName}
            </div>
          )}
          
          {notification.actionUrl && (
            <a
              href={notification.actionUrl}
              className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              View Details →
            </a>
          )}
        </div>
        
        <div className="flex flex-col space-y-1 ml-2">
          {!notification.read && (
            <button
              onClick={() => onRead(notification.id)}
              className="text-xs text-blue-600 hover:text-blue-800"
              title="Mark as read"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => onRemove(notification.id)}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Remove"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// Notifications Panel Component
interface NotificationsPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function NotificationsPanel({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onRemove,
  onClearAll,
  isOpen,
  onClose
}: NotificationsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <div className="w-full max-w-md bg-white shadow-xl h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="flex space-x-2 mt-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
              disabled={unreadCount === 0}
            >
              Mark All Read
            </button>
            <button
              onClick={onClearAll}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={onMarkAsRead}
                onRemove={onRemove}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Utility function
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

// Export components
export {
  NotificationsPanel
};

// Notification types already exported above