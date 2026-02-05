'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  userId: string;
  type:
    | 'INFO'
    | 'SUCCESS'
    | 'WARNING'
    | 'ERROR'
    | 'VIDEO_COMPLETED'
    | 'PROJECT_SHARED'
    | 'TEMPLATE_PURCHASED';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationIds: string[]) => void;
  markAllAsRead: () => void;
  createNotification: (
    notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>,
  ) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Initialize socket for real-time notifications
    const newSocket = io('/api/socket/io', {
      path: '/api/socket/io',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification server');
      setIsConnected(true);
      // Join user-specific room
      newSocket.emit('join_user_notifications', session.user.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification server');
      setIsConnected(false);
    });

    newSocket.on('new_notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }
    });

    setSocket(newSocket);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.disconnect();
    };
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    // Fetch initial notifications
    fetchNotifications();
  }, [session?.user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/user/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notificationIds.includes(notification.id)
              ? { ...notification, read: true }
              : notification,
          ),
        );

        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const createNotification = async (
    notificationData: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>,
  ) => {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (response.ok) {
        const data = await response.json();
        const newNotification = data.notification;

        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/favicon.ico',
          });
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    createNotification,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return '✅';
      case 'WARNING':
        return '⚠️';
      case 'ERROR':
        return '❌';
      case 'VIDEO_COMPLETED':
        return '🎬';
      case 'PROJECT_SHARED':
        return '🔗';
      case 'TEMPLATE_PURCHASED':
        return '🛒';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'border-green-200 bg-green-50';
      case 'WARNING':
        return 'border-yellow-200 bg-yellow-50';
      case 'ERROR':
        return 'border-red-200 bg-red-50';
      case 'VIDEO_COMPLETED':
        return 'border-blue-200 bg-blue-50';
      case 'PROJECT_SHARED':
        return 'border-purple-200 bg-purple-50';
      case 'TEMPLATE_PURCHASED':
        return 'border-indigo-200 bg-indigo-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInDays < 7) return `${diffInDays} dias atrás`;

    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5v-5zM9 7h2l2 2v7l-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h2z"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Notificações</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="mb-2">🔔</div>
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead([notification.id]);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}
                          >
                            <h4 className="font-medium text-sm text-gray-900">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
