import { createBrowserClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

// Mock Supabase client for E2E testing
class MockSupabaseClient {
  private mockUsers = new Map<string, any>();
  private mockSession: any = null;

  auth = {
    signUp: async ({ email, password, options }: any) => {
      // Simulate successful signup
      const user = {
        id: `mock-user-${Date.now()}`,
        email,
        user_metadata: options?.data || {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
      
      this.mockUsers.set(email, { ...user, password });
      
      return {
        data: { user, session: null },
        error: null,
      };
    },

    signInWithPassword: async ({ email, password }: any) => {
      const user = this.mockUsers.get(email);
      
      if (!user || user.password !== password) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        };
      }

      const session = {
        access_token: 'mock-token',
        user: { ...user },
      };
      
      this.mockSession = session;
      
      return {
        data: { user: user, session },
        error: null,
      };
    },

    signOut: async () => {
      this.mockSession = null;
      return { error: null };
    },

    getSession: async () => {
      return {
        data: { session: this.mockSession },
        error: null,
      };
    },

    getUser: async () => {
      return {
        data: { user: this.mockSession?.user || null },
        error: null,
      };
    },

    resetPasswordForEmail: async ({ email }: any) => {
      return {
        data: {},
        error: null,
      };
    },

    onAuthStateChange: (callback: any) => {
      // Mock auth state change listener - NO WebSocket connection
      return {
        data: { subscription: { unsubscribe: () => {} } },
      };
    },
  };

  // Mock Realtime channel - prevents WebSocket connections
  channel(name: string, opts?: any) {
    logger.debug(`[Mock Supabase] Channel "${name}" created (no WebSocket)`, { service: 'MockSupabaseClient' });
    
    return {
      on: (event: string, filter: any, callback?: any) => {
        logger.debug(`[Mock Supabase] Channel "${name}" listener added for ${event}`, { service: 'MockSupabaseClient' });
        return this.channel(name, opts); // Chainable
      },
      subscribe: (callback?: any) => {
        logger.debug(`[Mock Supabase] Channel "${name}" subscribed (mock)`, { service: 'MockSupabaseClient' });
        if (callback) {
          setTimeout(() => callback('SUBSCRIBED'), 0);
        }
        return this.channel(name, opts); // Chainable
      },
      unsubscribe: async () => {
        logger.debug(`[Mock Supabase] Channel "${name}" unsubscribed`, { service: 'MockSupabaseClient' });
        return { error: null };
      },
      send: async (payload: any) => {
        logger.debug(`[Mock Supabase] Channel "${name}" send (mock)`, { service: 'MockSupabaseClient', payload });
        return { error: null };
      },
    };
  }

  // Remove a specific channel
  removeChannel(channel: any) {
    logger.debug('[Mock Supabase] removeChannel called (mock cleanup)', { service: 'MockSupabaseClient' });
    if (channel && typeof channel.unsubscribe === 'function') {
      return channel.unsubscribe();
    }
    return Promise.resolve({ error: null });
  }

  // Remove all channels
  removeAllChannels() {
    logger.debug('[Mock Supabase] removeAllChannels called (mock cleanup)', { service: 'MockSupabaseClient' });
    return Promise.resolve({ error: null });
  }

  // Get all channels
  getChannels() {
    logger.debug('[Mock Supabase] getChannels called (returning empty array)', { service: 'MockSupabaseClient' });
    return [];
  }

  from(table: string) {
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
    };
  }
}

let client: any;
let connectionFailed = false;

// Função para testar conectividade Supabase
async function testSupabaseConnection(url: string, key: string): Promise<boolean> {
  if (connectionFailed) return false; // Cache falha para evitar múltiplos tests
  
  try {
    const testClient = createBrowserClient(url, key);
    // Teste simples de conectividade
    const { error } = await testClient.auth.getSession();
    if (error && error.message.includes('fetch failed')) {
      connectionFailed = true;
      return false;
    }
    return true;
  } catch (error) {
    connectionFailed = true;
    return false;
  }
}

export function getBrowserClient() {
  if (client) {
    return client;
  }

  // Check if Realtime is disabled via env flag
  const disableRealtime = process.env.NEXT_PUBLIC_DISABLE_SUPABASE_REALTIME === 'true';
  
  // Check if we're in E2E test mode or dev bypass
  const isE2E = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     document.cookie.includes('dev_bypass=true'));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Use mock client if:
  // 1. Supabase is not configured
  // 2. In E2E mode
  // 3. Realtime explicitly disabled
  // 4. Connection previously failed
  if (!supabaseUrl || !supabaseKey || isE2E || disableRealtime || connectionFailed) {
    logger.info('[Supabase] Using mock client (no WebSocket connections)', { service: 'BrowserClient' });
    client = new MockSupabaseClient();
    return client;
  }

  // Try to create real client, fallback to mock on failure
  try {
    client = createBrowserClient(supabaseUrl, supabaseKey);
    
    // Test connection in background (não bloquear UI)
    if (typeof window !== 'undefined') {
      testSupabaseConnection(supabaseUrl, supabaseKey).then(isConnected => {
        if (!isConnected) {
          logger.warn('[Supabase] Connection test failed, consider using mock client for better UX', { service: 'BrowserClient' });
        }
      });
    }
    
    return client;
  } catch (error) {
    logger.warn('[Supabase] Failed to create client, using mock fallback', { 
      service: 'BrowserClient',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    connectionFailed = true;
    client = new MockSupabaseClient();
    return client;
  }
}
