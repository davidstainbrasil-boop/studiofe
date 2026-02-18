'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Client-side auth hook using Supabase.
 * Listens for auth state changes and provides user, session, sign out.
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(
      (result: { data: { session: Session | null } }) => {
        const session = result.data.session;
      setState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session?.user,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setState({
          user: session?.user ?? null,
          session,
          isLoading: false,
          isAuthenticated: !!session?.user,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  const refreshSession = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.refreshSession();
    setState({
      user: session?.user ?? null,
      session,
      isLoading: false,
      isAuthenticated: !!session?.user,
    });
  }, []);

  return { ...state, signOut, refreshSession };
}
