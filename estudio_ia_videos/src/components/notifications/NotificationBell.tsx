import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { NotificationList } from './NotificationList';
import { useNotificationSubscription } from '@/hooks/use-notification-subscription';

export function NotificationBell() {
    const unreadCount = useNotificationStore((state) => state.unreadCount);

    // Enable real-time updates
    useNotificationSubscription();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <NotificationList />
            </PopoverContent>
        </Popover>
    );
}
