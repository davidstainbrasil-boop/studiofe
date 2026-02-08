import { logger } from '@/lib/logger';
/**
 * 🔐 Session Timeout Hook
 * Manages user session activity and handles token refresh
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface UseSessionTimeoutOptions {
  /** Warn user X ms before session expires */
  warningThresholdMs?: number;
  /** Refresh token when idle for X ms */
  refreshThresholdMs?: number;
  /** Check session every X ms */
  checkIntervalMs?: number;
  /** Callback when session is about to expire */
  onSessionWarning?: () => void;
  /** Callback when session expires */
  onSessionExpired?: () => void;
}

const DEFAULT_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const DEFAULT_REFRESH_THRESHOLD = 10 * 60 * 1000; // Refresh if idle for 10 min
const DEFAULT_CHECK_INTERVAL = 60 * 1000; // Check every minute

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    warningThresholdMs = DEFAULT_WARNING_THRESHOLD,
    refreshThresholdMs = DEFAULT_REFRESH_THRESHOLD,
    checkIntervalMs = DEFAULT_CHECK_INTERVAL,
    onSessionWarning,
    onSessionExpired
  } = options;

  const supabase = createClientComponentClient();
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // Refresh session silently
  const refreshSession = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        logger.error('Session refresh failed:', error);
        onSessionExpired?.();
      }
    } catch (err) {
      logger.error('Session refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, isRefreshing, onSessionExpired]);

  // Check session status
  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      onSessionExpired?.();
      return;
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Session about to expire
    if (timeUntilExpiry <= warningThresholdMs && timeUntilExpiry > 0) {
      setShowWarning(true);
      onSessionWarning?.();
      
      // If user was recently active, refresh
      const timeSinceActivity = now - lastActivityRef.current;
      if (timeSinceActivity < refreshThresholdMs) {
        await refreshSession();
      }
    }

    // Session expired
    if (timeUntilExpiry <= 0) {
      setShowWarning(false);
      onSessionExpired?.();
    }
  }, [supabase, warningThresholdMs, refreshThresholdMs, onSessionWarning, onSessionExpired, refreshSession]);

  // Handle session extend (user clicked "Stay logged in")
  const extendSession = useCallback(async () => {
    updateActivity();
    await refreshSession();
    setShowWarning(false);
  }, [updateActivity, refreshSession]);

  // Setup activity listeners and session check interval
  useEffect(() => {
    // Activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Session check interval
    const interval = setInterval(checkSession, checkIntervalMs);

    // Initial check
    checkSession();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [updateActivity, checkSession, checkIntervalMs]);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        setShowWarning(false);
      }
      if (event === 'TOKEN_REFRESHED') {
        updateActivity();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, updateActivity]);

  return {
    showWarning,
    isRefreshing,
    extendSession,
    refreshSession
  };
}
