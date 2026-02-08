jest.mock('next/server', () => {
  return {
    NextResponse: class {
      static json(body, init) {
        return {
          status: init?.status ?? 200,
          json: async () => body,
          body
        }
      }
      static redirect(url) {
        return {
          status: 307,
          headers: new Map([['Location', url]])
        }
      }
    },
    NextRequest: class {
      constructor(url, init) {
        this.url = url
        this.method = init?.method || 'GET'
        this.headers = new Map(Object.entries(init?.headers || {}))
        this.body = init?.body
        this.nextUrl = new URL(url)
      }
      async json() {
        return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
      }
    },
    // Mock cookies API for Next.js
    cookies: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockReturnValue({ value: 'test-cookie-value' }),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn().mockReturnValue(false),
      clear: jest.fn(),
    }))
  }
})

// Mock next-auth (ESM module not compatible with Jest CJS)
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }),
}))

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn().mockResolvedValue({ sub: 'test-user-id' }),
  encode: jest.fn(),
  decode: jest.fn(),
}))

require('@testing-library/jest-dom')

// Mock Next.js cookies API that might be called directly
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockImplementation((name) => ({ 
      name, 
      value: name.includes('sb-access-token') ? 'mock-access-token' : 'mock-cookie-value' 
    })),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    clear: jest.fn(),
  })),
}))

// Mock Supabase client with complete auth methods
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user-id', 
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User', avatar_url: null }
          } 
        },
        error: null
      }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test-url.com' } }),
        remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })
    }
  })),
  supabaseAdmin: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  }),
  getSupabaseForRequest: jest.fn().mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user-id', 
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User', avatar_url: null }
          } 
        },
        error: null
      }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      delete: jest.fn().mockResolvedValue({ data: {}, error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  }),
  fromUntypedTable: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
  }),
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.E2E_TEST = 'true'
process.env.E2E_TEST_TOKEN = 'test-token'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.AWS_REGION = 'us-east-1'
process.env.AWS_S3_BUCKET = 'test-bucket'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
process.env.AUDIO2FACE_API_URL = 'http://localhost:8011' // Keep localhost for tests unless specific integration test requires otherwise
process.env.REDIS_URL = 'redis://localhost:6379' // Keep localhost for tests


// Mock console methods to reduce noise in tests (keep errors for debugging)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging real issues
  error: console.error,
}


// Mock File and Blob for browser APIs
if (typeof Blob !== 'undefined') {
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function() {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(this);
      });
    };
  }

  global.File = class MockFile extends Blob {
    constructor(parts, filename, properties) {
      super(parts, properties);
      this.name = filename;
      this.lastModified = Date.now();
    }
  }
} else {
  global.File = class MockFile {
    constructor(parts, filename, properties) {
      this.parts = parts
      this.name = filename
      this.lastModified = Date.now()
      this.size = parts.reduce((acc, part) => acc + (Buffer.isBuffer(part) ? part.length : Buffer.from(part).length), 0)
      this.type = properties?.type || ''
    }

    async arrayBuffer() {
      const buffers = this.parts.map(part => (Buffer.isBuffer(part) ? part : Buffer.from(part)))
      const buffer = Buffer.concat(buffers)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    }
  }
}

// Mock Redis (ioredis) to prevent connection issues in tests
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    flushall: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    connect: jest.fn().mockResolvedValue('OK'),
    eval: jest.fn().mockResolvedValue(1),
    status: 'ready',
  };
  
  return jest.fn().mockImplementation(() => mockRedis);
})

// Mock fetch
global.fetch = jest.fn((url) => {
  // Mock Audio2Face responses
  if (typeof url === 'string' && url.includes('/sessions') && url.includes('/process')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        accuracy: 98.5,
        lipSyncData: [
          // Frame 1: 'a', 'o', 'ã' (jawOpen > 0.5)
          { timestampMs: 0, jawOpen: 0.8, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0, mouthLeft: 0, mouthRollLower: 0, tongueOut: 0, mouthSmile: 0, mouthShrugUpper: 0 },
          // Frame 2: 'p', 'b', 'm' (mouthClose > 0.7)
          { timestampMs: 100, jawOpen: 0, mouthClose: 0.9, mouthFunnel: 0, mouthPucker: 0, mouthLeft: 0, mouthRollLower: 0, tongueOut: 0, mouthSmile: 0, mouthShrugUpper: 0 },
          // Frame 3: 'o', 'u' (mouthFunnel > 0.6)
          { timestampMs: 200, jawOpen: 0, mouthClose: 0, mouthFunnel: 0.8, mouthPucker: 0, mouthLeft: 0, mouthRollLower: 0, tongueOut: 0, mouthSmile: 0, mouthShrugUpper: 0 },
          // Frame 4: 'u' (mouthPucker > 0.5)
          { timestampMs: 300, jawOpen: 0, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0.8, mouthLeft: 0, mouthRollLower: 0, tongueOut: 0, mouthSmile: 0, mouthShrugUpper: 0 },
          // Frame 5: 'e', 'i' (mouthLeft > 0.4)
          { timestampMs: 400, jawOpen: 0, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0, mouthLeft: 0.6, mouthRollLower: 0, tongueOut: 0, mouthSmile: 0, mouthShrugUpper: 0 },
          // Frame 6: 'f', 'v' (mouthRollLower > 0.4)
          { timestampMs: 500, jawOpen: 0, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0, mouthLeft: 0, mouthRollLower: 0.6, tongueOut: 0, mouthSmile: 0, mouthShrugUpper: 0 },
          // Frame 7: 'l', 'n', 'd', 't', 'r' (tongueOut > 0.3)
          { timestampMs: 600, jawOpen: 0, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0, mouthLeft: 0, mouthRollLower: 0, tongueOut: 0.5, mouthSmile: 0, mouthShrugUpper: 0 },
          // Frame 8: 'k', 's', 'z' (mouthSmile > 0.5)
          { timestampMs: 700, jawOpen: 0, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0, mouthLeft: 0, mouthRollLower: 0, tongueOut: 0, mouthSmile: 0.7, mouthShrugUpper: 0 },
          // Frame 9: 'ks', 'ps', 'pn', 'eu', 'tr' (mouthShrugUpper > 0.4)
          { timestampMs: 800, jawOpen: 0, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0, mouthLeft: 0, mouthRollLower: 0, tongueOut: 0, mouthSmile: 0, mouthShrugUpper: 0.6 }
        ],
        metadata: { frameRate: 60, totalFrames: 100, audioLength: 5, audioLengthMs: 5000 },
        qualityMetrics: { phonemeAccuracy: 95, temporalConsistency: 95, visualRealism: 95 }
      }),
      text: () => Promise.resolve('OK')
    })
  }
  
  if (typeof url === 'string' && url.includes('/sessions')) {
     return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ sessionId: 'mock-session-id' }),
      text: () => Promise.resolve('OK')
    })
  }

  return Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ok: true,
    status: 200,
    headers: new Map(),
  })
});

// Timeout global para testes assíncronos
jest.setTimeout(120000) // 2 minutos

// Cleanup após cada teste
afterEach(() => {
  jest.clearAllMocks()
})

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Radix UI relies on ResizeObserver in jsdom tests
if (typeof document !== 'undefined' && !global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Mock crypto.randomUUID for Node < 19 or test environments
if (!global.crypto) {
  global.crypto = {}
}
// Force override randomUUID if it doesn't exist or to ensure it works in jsdom
if (!global.crypto.randomUUID) {
  Object.defineProperty(global.crypto, 'randomUUID', {
    value: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
    writable: true
  });
}

// Mock para WebSocket se necessário
// Overwrite global WebSocket only in jsdom to avoid breaking Node-based socket tests
if (typeof document !== 'undefined') {
  global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
}

// Global teardown: clear any remaining timers/handles to prevent worker leak
afterAll(() => {
  jest.clearAllTimers();
})
