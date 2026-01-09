/**
 * Tests for GET /api/system/info
 * 
 * This endpoint returns detailed system information.
 * Protected - requires admin authentication.
 */

// Force module mode to avoid redeclaration errors
export {};

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (data: Record<string, unknown>, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  getSupabaseForRequest: jest.fn(),
}));

const { GET } = require('../../api/system/info/route');
const { getSupabaseForRequest } = require('@/lib/supabase/server');

describe('GET /api/system/info', () => {
  function makeRequest(): Record<string, unknown> {
    return {
      url: 'http://localhost/api/system/info',
      nextUrl: new URL('http://localhost/api/system/info'),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') }),
      },
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'user-123', email: 'user@test.com' } }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'user' }, error: null })
          })
        })
      }),
      rpc: jest.fn().mockResolvedValue({ data: 'user', error: null }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns system info for admin users', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'admin-123', email: 'admin@test.com' } }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
          })
        })
      }),
      rpc: jest.fn().mockResolvedValue({ data: 'admin', error: null }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('system');
    expect(data).toHaveProperty('process');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('timestamp');
  });

  it('returns system info for manager users', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'manager-123', email: 'manager@test.com' } }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'manager' }, error: null })
          })
        })
      }),
      rpc: jest.fn().mockResolvedValue({ data: 'manager', error: null }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('system');
  });

  it('includes memory usage in bytes with formatted values', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'admin-123' } }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
          })
        })
      }),
      rpc: jest.fn().mockResolvedValue({ data: 'admin', error: null }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.system.memoryUsage).toHaveProperty('heapTotal');
    expect(data.system.memoryUsage).toHaveProperty('heapUsed');
    expect(data.system.memoryUsage).toHaveProperty('rss');
    // Check format is like "123.45 MB"
    expect(data.system.memoryUsage.heapTotal).toMatch(/^\d+\.\d{2}\s+(B|KB|MB|GB|TB)$/);
  });

  it('includes CPU count and load average', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'admin-123' } }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
          })
        })
      }),
      rpc: jest.fn().mockResolvedValue({ data: 'admin', error: null }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(typeof data.system.cpus).toBe('number');
    expect(data.system.cpus).toBeGreaterThan(0);
    expect(Array.isArray(data.system.loadAverage)).toBe(true);
    expect(data.system.loadAverage.length).toBe(3);
  });

  it('includes formatted uptime', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'admin-123' } }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
          })
        })
      }),
      rpc: jest.fn().mockResolvedValue({ data: 'admin', error: null }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(typeof data.process.uptime).toBe('number');
    expect(typeof data.process.uptimeFormatted).toBe('string');
    expect(data.process.uptimeFormatted).toMatch(/\d+[dhms]/);
  });
});
