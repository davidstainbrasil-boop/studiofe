import { createBrowserClient } from '@supabase/ssr';
import { logger } from '@lib/logger';

function isLikelyPlaceholderSupabaseValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('seu_project_id') ||
    v.includes('your-project') ||
    v.includes('your_public_anon_key') ||
    v.includes('sua-anon-key') ||
    v.includes('your_service_role_key') ||
    v.includes('sua-service-role-key')
  );
}

function isSupabasePublicConfigMissingOrPlaceholder(url?: string, key?: string): boolean {
  if (!url || !key) return true;
  return isLikelyPlaceholderSupabaseValue(url) || isLikelyPlaceholderSupabaseValue(key);
}

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
        createdAt: new Date().toISOString(),
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
          error: new Error('Invalid login credentials'),
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

function patchRealtimeToNoop(supabaseClient: any) {
  const noopChannel = (name: string, opts?: any) => {
    logger.info(`[Supabase] Realtime disabled via config; patching channel "${name}" to no-op (Safe Mode)`, {
      service: 'BrowserClient',
    });

    return {
      on: (_event: string, _filter: any, _callback?: any) => noopChannel(name, opts),
      subscribe: (callback?: any) => {
        if (callback) {
          setTimeout(() => callback('SUBSCRIBED'), 0);
        }
        return noopChannel(name, opts);
      },
      unsubscribe: async () => ({ error: null }),
      send: async (_payload: any) => ({ error: null }),
    };
  };

  // Patch only realtime-related methods; keep auth/db working.
  supabaseClient.channel = noopChannel;
  supabaseClient.removeChannel = async (channel: any) => {
    if (channel && typeof channel.unsubscribe === 'function') {
      return channel.unsubscribe();
    }
    return { error: null };
  };
  supabaseClient.removeAllChannels = async () => ({ error: null });
  supabaseClient.getChannels = () => [];

  return supabaseClient;
}

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

  const allowMock = process.env.NODE_ENV !== 'production';

  // Explicit E2E/mock mode (do not infer from hostname; localhost is a valid dev target)
  const forceMockViaEnv = process.env.NEXT_PUBLIC_SUPABASE_FORCE_MOCK === 'true';
  const forceMockViaCookie =
    allowMock && typeof document !== 'undefined' && document.cookie.includes('dev_bypass=true');
  const forceMock = forceMockViaEnv || forceMockViaCookie;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase must be configured in production.
  if (isSupabasePublicConfigMissingOrPlaceholder(supabaseUrl, supabaseKey)) {
    if (allowMock) {
      logger.info('[Supabase] Missing config; using mock client (dev/test only)', { service: 'BrowserClient' });
      client = new MockSupabaseClient();
      return client;
    }

    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  // TypeScript guard: depois da validação acima, esses valores devem existir.
  // Mantemos uma checagem explícita para satisfazer o type-check e evitar undefined.
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const configuredSupabaseUrl = supabaseUrl;
  const configuredSupabaseKey = supabaseKey;

  // Use mock client only when explicitly requested (or previous failure in dev/test).
  if (forceMock || (allowMock && connectionFailed)) {
    logger.info('[Supabase] Using mock client (explicit dev/test mode)', { service: 'BrowserClient' });
    client = new MockSupabaseClient();
    return client;
  }

  // Try to create real client, fallback to mock on failure
  try {
    client = createBrowserClient(configuredSupabaseUrl, configuredSupabaseKey);

    if (disableRealtime) {
      client = patchRealtimeToNoop(client);
    }
    
    // Test connection in background (não bloquear UI)
    if (typeof window !== 'undefined') {
      testSupabaseConnection(configuredSupabaseUrl, configuredSupabaseKey).then(isConnected => {
        if (!isConnected) {
          logger.warn('[Supabase] Connection test failed, consider using mock client for better UX', { service: 'BrowserClient' });
        }
      });
    }
    
    return client;
  } catch (error) {
    logger.warn('[Supabase] Failed to create client', {
      service: 'BrowserClient',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    connectionFailed = true;

    if (allowMock) {
      logger.warn('[Supabase] Using mock fallback (dev/test only)', { service: 'BrowserClient' });
      client = new MockSupabaseClient();
      return client;
    }

    throw error;
  }
}
