import useSWR from 'swr';
import { useCallback } from 'react';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Hook: user notifications with unread count */
export function useNotifications(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    `/api/notifications?limit=${limit}`,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      refreshInterval: 30_000, // Poll every 30s for new notifications
    }
  );

  const markAsRead = useCallback(
    async (ids?: string[]) => {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids ? { ids } : { all: true }),
      });
      mutate();
    },
    [mutate]
  );

  return {
    notifications: data?.data.notifications ?? [],
    unreadCount: data?.data.unreadCount ?? 0,
    isLoading,
    error: error?.message,
    markAsRead,
    refresh: mutate,
  };
}
