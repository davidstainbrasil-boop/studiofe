'use client';

/**
 * Notifications System
 * 
 * Real-time notifications with:
 * - In-app notifications
 * - Browser push notifications
 * - Email notifications (via API)
 * - Notification preferences
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Check,
  X,
  Trash2,
  Settings,
  Video,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  Users,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Types
export type NotificationType = 
  | 'render_complete'
  | 'render_failed'
  | 'collaboration_invite'
  | 'comment'
  | 'mention'
  | 'subscription'
  | 'system'
  | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  email: boolean;
  types: {
    render: boolean;
    collaboration: boolean;
    subscription: boolean;
    system: boolean;
  };
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inApp: true,
  push: true,
  email: true,
  types: {
    render: true,
    collaboration: true,
    subscription: true,
    system: true,
  },
};

// Notification Icons
const NOTIFICATION_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  render_complete: CheckCircle,
  render_failed: AlertCircle,
  collaboration_invite: Users,
  comment: FileText,
  mention: Info,
  subscription: CreditCard,
  system: Settings,
  info: Info,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  render_complete: 'text-green-500 bg-green-50',
  render_failed: 'text-red-500 bg-red-50',
  collaboration_invite: 'text-blue-500 bg-blue-50',
  comment: 'text-violet-500 bg-violet-50',
  mention: 'text-amber-500 bg-amber-50',
  subscription: 'text-emerald-500 bg-emerald-50',
  system: 'text-slate-500 bg-slate-50',
  info: 'text-blue-500 bg-blue-50',
};

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Request push notification permission
  useEffect(() => {
    if (preferences.push && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [preferences.push]);

  // Add notification
  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show browser notification
    if (preferences.push && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      });
    }
  }, [preferences.push]);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update preferences
  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        updatePreferences,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

// Notification Bell Component
export function NotificationBell({ className }: { className?: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', className)}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              Marcar como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <BellOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type];
                const colorClass = NOTIFICATION_COLORS[notification.type];

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer',
                      !notification.read && 'bg-violet-50/50 dark:bg-violet-900/10'
                    )}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={cn('p-2 rounded-full', colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        {notification.actionLabel && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 mt-1"
                          >
                            {notification.actionLabel}
                          </Button>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full" asChild>
              <a href="/notifications">Ver todas</a>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Notification Preferences Component
export function NotificationPreferencesEditor() {
  const { preferences, updatePreferences } = useNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Canais de Notificação</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações no App</p>
              <p className="text-sm text-slate-500">Receber notificações dentro do aplicativo</p>
            </div>
            <Switch
              checked={preferences.inApp}
              onCheckedChange={(checked) => updatePreferences({ inApp: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-slate-500">Notificações do navegador</p>
            </div>
            <Switch
              checked={preferences.push}
              onCheckedChange={(checked) => updatePreferences({ push: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-slate-500">Receber resumos por email</p>
            </div>
            <Switch
              checked={preferences.email}
              onCheckedChange={(checked) => updatePreferences({ email: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Tipos de Notificação</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Renderização</p>
              <p className="text-sm text-slate-500">Quando vídeos forem concluídos</p>
            </div>
            <Switch
              checked={preferences.types.render}
              onCheckedChange={(checked) =>
                updatePreferences({
                  types: { ...preferences.types, render: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Colaboração</p>
              <p className="text-sm text-slate-500">Convites, comentários, menções</p>
            </div>
            <Switch
              checked={preferences.types.collaboration}
              onCheckedChange={(checked) =>
                updatePreferences({
                  types: { ...preferences.types, collaboration: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Assinatura</p>
              <p className="text-sm text-slate-500">Pagamentos e limites de uso</p>
            </div>
            <Switch
              checked={preferences.types.subscription}
              onCheckedChange={(checked) =>
                updatePreferences({
                  types: { ...preferences.types, subscription: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sistema</p>
              <p className="text-sm text-slate-500">Atualizações e manutenção</p>
            </div>
            <Switch
              checked={preferences.types.system}
              onCheckedChange={(checked) =>
                updatePreferences({
                  types: { ...preferences.types, system: checked },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationsProvider;
