'use client';

import { useCallback } from 'react';
import {
  captureException,
  captureMessage,
  setUser,
  clearUser,
} from '@/lib/monitoring/sentry.client';

/**
 * Hook personalizado para facilitar o uso do Sentry
 */
export function useSentry() {
  const captureError = useCallback((error: Error, context?: Record<string, unknown>) => {
    captureException(error, context);
  }, []);

  const logMessage = useCallback(
    (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
      captureMessage(message, level);
    },
    [],
  );

  const setUserInfo = useCallback((user: { id: string; email?: string; username?: string }) => {
    setUser(user);
  }, []);

  const clearUserInfo = useCallback(() => {
    clearUser();
  }, []);

  return {
    captureError,
    logMessage,
    setUserInfo,
    clearUserInfo,
  };
}
