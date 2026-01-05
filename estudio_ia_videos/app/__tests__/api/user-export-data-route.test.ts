/**
 * Tests for POST /api/user/export-data
 * 
 * This endpoint exports all user data for LGPD/GDPR compliance.
 */

// Force module mode to avoid redeclaration errors
export {};

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (data: Record<string, unknown>, init?: { status?: number; headers?: Record<string, string> }) => {
      const headers = new Map<string, string>();
      if (init?.headers) {
        Object.entries(init.headers).forEach(([k, v]) => headers.set(k, v));
      }
      return {
        status: init?.status ?? 200,
        json: async () => data,
        headers: {
          get: (k: string) => headers.get(k),
        },
      };
    },
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  getSupabaseForRequest: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const { POST } = require('../../api/user/export-data/route');
const { getSupabaseForRequest } = require('@/lib/supabase/server');

describe('POST /api/user/export-data', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  };

  const mockProjects = [
    { id: 'proj-1', name: 'Project 1', description: 'Test', status: 'completed', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z' },
    { id: 'proj-2', name: 'Project 2', description: 'Test 2', status: 'in_progress', created_at: '2024-01-05T00:00:00Z', updated_at: '2024-01-06T00:00:00Z' },
  ];

  const mockRenders = [
    { id: 'render-1', status: 'completed', progress: 100, created_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T01:00:00Z', output_url: 'https://example.com/video1.mp4' },
  ];

  const mockSlides = [
    { id: 'slide-1', project_id: 'proj-1', order_index: 0, title: 'Intro', content: 'Welcome', created_at: '2024-01-01T00:00:00Z' },
    { id: 'slide-2', project_id: 'proj-1', order_index: 1, title: 'Content', content: 'Main', created_at: '2024-01-01T00:00:00Z' },
  ];

  function makeRequest(body: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      url: 'http://localhost/api/user/export-data',
      nextUrl: new URL('http://localhost/api/user/export-data'),
      json: jest.fn().mockResolvedValue(body),
    };
  }

  function createMockSupabase() {
    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
      from: jest.fn((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: table === 'users' ? mockProfile : null, error: null }),
        then: jest.fn((resolve) => {
          if (table === 'projects') resolve({ data: mockProjects, error: null });
          else if (table === 'render_jobs') resolve({ data: mockRenders, error: null });
          else if (table === 'slides') resolve({ data: mockSlides, error: null });
          else resolve({ data: [], error: null });
        }),
      })),
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

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('exports user data in JSON format by default', async () => {
    getSupabaseForRequest.mockReturnValue(createMockSupabase());

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('exportInfo');
    expect(data).toHaveProperty('profile');
    expect(data).toHaveProperty('projects');
    expect(data).toHaveProperty('renders');
    expect(data).toHaveProperty('slides');
  });

  it('includes export metadata', async () => {
    getSupabaseForRequest.mockReturnValue(createMockSupabase());

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(data.exportInfo).toHaveProperty('requestedAt');
    expect(data.exportInfo).toHaveProperty('format', 'json');
    expect(data.exportInfo).toHaveProperty('userId', mockUser.id);
    expect(data.exportInfo).toHaveProperty('email', mockUser.email);
  });

  it('includes Content-Disposition header for download', async () => {
    getSupabaseForRequest.mockReturnValue(createMockSupabase());

    const response = await POST(makeRequest());

    const contentDisposition = response.headers.get('Content-Disposition');
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('user-data-export');
    expect(contentDisposition).toContain('.json');
  });

  it('respects includeProjects=false option', async () => {
    getSupabaseForRequest.mockReturnValue(createMockSupabase());

    const response = await POST(makeRequest({ includeProjects: false }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projects).toEqual([]);
  });

  it('respects includeRenders=false option', async () => {
    getSupabaseForRequest.mockReturnValue(createMockSupabase());

    const response = await POST(makeRequest({ includeRenders: false }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.renders).toEqual([]);
  });

  it('respects includeSlides=false option', async () => {
    getSupabaseForRequest.mockReturnValue(createMockSupabase());

    const response = await POST(makeRequest({ includeSlides: false }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slides).toEqual([]);
  });

  it('accepts format=json explicitly', async () => {
    getSupabaseForRequest.mockReturnValue(createMockSupabase());

    const response = await POST(makeRequest({ format: 'json' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exportInfo.format).toBe('json');
  });

  it('handles empty data gracefully', async () => {
    const emptySupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      }),
    };
    getSupabaseForRequest.mockReturnValue(emptySupabase);

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projects).toEqual([]);
    expect(data.renders).toEqual([]);
    expect(data.slides).toEqual([]);
  });
});
