/**
 * Tests for GET /api/analytics/usage-stats
 * 
 * This endpoint returns aggregated usage statistics for the platform.
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

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const { GET } = require('../../api/analytics/usage-stats/route');
const { getSupabaseForRequest } = require('@/lib/supabase/server');

describe('GET /api/analytics/usage-stats', () => {
  function makeRequest(query = ''): Record<string, unknown> {
    const url = `http://localhost/api/analytics/usage-stats${query ? '?' + query : ''}`;
    return {
      url,
      nextUrl: new URL(url),
    };
  }

  function createMockSupabase(overrides: Record<string, unknown> = {}) {
    const defaultData = {
      projects: 100,
      createdProjects: 10,
      completedProjects: 50,
      inProgressProjects: 25,
      totalRenders: 200,
      completedRenders: 180,
      failedRenders: 15,
      cancelledRenders: 5,
      totalUsers: 50,
      newUsers: 5,
    };

    const data = { ...defaultData, ...overrides };

    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'user-123', email: 'test@test.com' } }, 
          error: null 
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        // Mock different counts based on call order
        then: jest.fn((resolve) => resolve({ count: data.projects, error: null })),
      }),
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

  it('returns usage stats with default 30d period', async () => {
    const mockSupabase = createMockSupabase();
    getSupabaseForRequest.mockReturnValue(mockSupabase);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('period');
    expect(data).toHaveProperty('projects');
    expect(data).toHaveProperty('renders');
    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('timestamp');
  });

  it('accepts different period parameters', async () => {
    const mockSupabase = createMockSupabase();
    getSupabaseForRequest.mockReturnValue(mockSupabase);

    const periods = ['24h', '7d', '30d', '90d', 'year'];
    
    for (const period of periods) {
      const response = await GET(makeRequest(`period=${period}`));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toHaveProperty('days');
      expect(typeof data.period.days).toBe('number');
    }
  });

  it('includes correct period information', async () => {
    const mockSupabase = createMockSupabase();
    getSupabaseForRequest.mockReturnValue(mockSupabase);

    const response = await GET(makeRequest('period=7d'));
    const data = await response.json();

    expect(data.period).toHaveProperty('start');
    expect(data.period).toHaveProperty('end');
    expect(data.period.days).toBeGreaterThanOrEqual(7);
    expect(data.period.days).toBeLessThanOrEqual(8); // Allow for rounding
  });

  it('returns project statistics', async () => {
    const mockSupabase = createMockSupabase();
    getSupabaseForRequest.mockReturnValue(mockSupabase);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.projects).toHaveProperty('total');
    expect(data.projects).toHaveProperty('created');
    expect(data.projects).toHaveProperty('completed');
    expect(data.projects).toHaveProperty('inProgress');
  });

  it('returns render statistics', async () => {
    const mockSupabase = createMockSupabase();
    getSupabaseForRequest.mockReturnValue(mockSupabase);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.renders).toHaveProperty('total');
    expect(data.renders).toHaveProperty('completed');
    expect(data.renders).toHaveProperty('failed');
    expect(data.renders).toHaveProperty('cancelled');
    expect(data.renders).toHaveProperty('avgDurationSeconds');
  });

  it('returns user statistics', async () => {
    const mockSupabase = createMockSupabase();
    getSupabaseForRequest.mockReturnValue(mockSupabase);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.users).toHaveProperty('total');
    expect(data.users).toHaveProperty('activeInPeriod');
    expect(data.users).toHaveProperty('newInPeriod');
  });

  it('includes ISO timestamp in response', async () => {
    const mockSupabase = createMockSupabase();
    getSupabaseForRequest.mockReturnValue(mockSupabase);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
