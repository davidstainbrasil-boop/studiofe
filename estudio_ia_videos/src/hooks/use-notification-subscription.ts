import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuth } from '@/hooks/use-auth';

export function useNotificationSubscription() {
  const { user } = useAuth();
  const addNotification = useNotificationStore((state) => state.addNotification);
  // Ref to track subscribed channel to prevent double subscription in strict mode
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    // Clean up previous subscription if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('render-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'render_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          // Only notify on status change to distinct final states
          if (newStatus !== oldStatus) {
            if (newStatus === 'completed') {
              addNotification({
                title: 'Render Completed',
                message: 'Your video has finished rendering.',
                type: 'success',
                link: payload.new.output_url || undefined,
              });
            } else if (newStatus === 'failed') {
              addNotification({
                title: 'Render Failed',
                message: payload.new.error_message || 'An error occurred during rendering.',
                type: 'error',
              });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, addNotification]);
}
