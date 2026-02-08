/**
 * Tests for DELETE /api/user/delete-account
 * 
 * This endpoint deletes all user data for LGPD/GDPR compliance.
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
  supabaseAdmin: {
    from: jest.fn(),
    storage: {
      from: jest.fn().mockReturnValue({
        remove: jest.fn().mockResolvedValue({ error: null }),
      }),
    },
    auth: {
      admin: {
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/rate-limit');

const { DELETE, GET } = require('../../api/user/delete-account/route');
const { getSupabaseForRequest, supabaseAdmin } = require('@/lib/supabase/server');

describe('DELETE /api/user/delete-account', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  function makeRequest(body: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      url: 'http://localhost/api/user/delete-account',
      nextUrl: new URL('http://localhost/api/user/delete-account'),
      json: jest.fn().mockResolvedValue(body),
    };
  }

  function setupMockSupabase() {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
    });

    // Setup admin mock
    supabaseAdmin.from.mockImplementation((table: string) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => {
        if (table === 'projects') {
          resolve({ data: [{ id: 'proj-1' }, { id: 'proj-2' }], error: null });
        } else if (table === 'render_jobs') {
          resolve({ data: [{ id: 'render-1', output_url: 'https://example.com/storage/v1/object/public/videos/test.mp4' }], error: null });
        } else {
          resolve({ data: [], error: null, count: 0 });
        }
      }),
    }));
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

    const response = await DELETE(makeRequest({ confirmPhrase: 'DELETE MY ACCOUNT' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when confirmPhrase is missing', async () => {
    setupMockSupabase();

    const response = await DELETE(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation Error');
    expect(data.message).toContain('DELETE MY ACCOUNT');
  });

  it('returns 400 when confirmPhrase is incorrect', async () => {
    setupMockSupabase();

    const response = await DELETE(makeRequest({ confirmPhrase: 'wrong phrase' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation Error');
  });

  it('deletes account when confirmPhrase is correct', async () => {
    setupMockSupabase();

    const response = await DELETE(makeRequest({ confirmPhrase: 'DELETE MY ACCOUNT' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('deletedAt');
    expect(data).toHaveProperty('summary');
  });

  it('returns deletion summary', async () => {
    setupMockSupabase();

    const response = await DELETE(makeRequest({ confirmPhrase: 'DELETE MY ACCOUNT' }));
    const data = await response.json();

    expect(data.summary).toHaveProperty('projectsDeleted');
    expect(data.summary).toHaveProperty('rendersDeleted');
    expect(data.summary).toHaveProperty('slidesDeleted');
    expect(data.summary).toHaveProperty('storageFilesDeleted');
    expect(data.summary).toHaveProperty('accountDeleted');
  });

  it('calls supabaseAdmin.auth.admin.deleteUser', async () => {
    setupMockSupabase();

    await DELETE(makeRequest({ confirmPhrase: 'DELETE MY ACCOUNT' }));

    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
  });

  it('respects deleteProjects=false option', async () => {
    setupMockSupabase();

    const response = await DELETE(makeRequest({ 
      confirmPhrase: 'DELETE MY ACCOUNT',
      deleteProjects: false 
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('respects deleteRenders=false option', async () => {
    setupMockSupabase();

    const response = await DELETE(makeRequest({ 
      confirmPhrase: 'DELETE MY ACCOUNT',
      deleteRenders: false 
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('includes ISO timestamp in deletedAt', async () => {
    setupMockSupabase();

    const response = await DELETE(makeRequest({ confirmPhrase: 'DELETE MY ACCOUNT' }));
    const data = await response.json();

    expect(data.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('GET /api/user/delete-account', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  function makeRequest(): Record<string, unknown> {
    return {
      url: 'http://localhost/api/user/delete-account',
      nextUrl: new URL('http://localhost/api/user/delete-account'),
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

  it('returns account summary when authenticated', async () => {
    getSupabaseForRequest.mockReturnValue({
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
        then: jest.fn((resolve) => resolve({ count: 5, data: [], error: null })),
      }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('userId');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('dataToBeDeleted');
    expect(data).toHaveProperty('warning');
    expect(data).toHaveProperty('instructions');
  });

  it('includes warning message about permanent deletion', async () => {
    getSupabaseForRequest.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ count: 0, data: [], error: null })),
      }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.warning).toContain('permanent');
  });
});
