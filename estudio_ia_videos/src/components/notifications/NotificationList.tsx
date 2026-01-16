import React from 'react';
import { useNotificationStore, NotificationItem } from '@/lib/stores/notification-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Check, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const iconMap = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
};

export function NotificationList() {
    const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground p-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Info className="w-6 h-6 opacity-50" />
                </div>
                <p className="text-sm font-medium">Nenhuma notificação</p>
                <p className="text-xs text-center mt-1">Você está atualizado!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[400px]">
            <div className="flex items-center justify-between p-3 border-b">
                <h4 className="font-semibold text-sm">Notificações</h4>
                <div className="flex gap-1">
                    <Button variant="ghost" size="xs" onClick={markAllAsRead} className="h-6 text-[10px]">
                        Lidar todas
                    </Button>
                    <Button variant="ghost" size="xs" onClick={clearAll} className="h-6 text-[10px]">
                        Limpar
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col divide-y">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={cn(
                                "flex gap-3 p-3 transition-colors hover:bg-muted/50",
                                !notification.read && "bg-muted/20 border-l-2 border-l-indigo-500"
                            )}
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div className="mt-1 flex-shrink-0">
                                {iconMap[notification.type]}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-start justify-between">
                                    <p className={cn("text-sm font-medium leading-none", !notification.read && "text-foreground")}>
                                        {notification.title}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {notification.message}
                                </p>
                                {notification.link && (
                                    <a
                                        href={notification.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-indigo-500 hover:underline mt-1 block"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Ver detalhes
                                    </a>
                                )}
                            </div>
                            {!notification.read && (
                                <div className="flex-shrink-0 self-center">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
