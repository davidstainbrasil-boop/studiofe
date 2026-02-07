/**
 * Tests for render stats API route
 * Tests: real Supabase data fetch, error handling, response structure
 */

// Mock Supabase before imports
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockNot = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: mockFrom,
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { GET } from '@/app/api/render/stats/route';

describe('GET /api/render/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default chain behavior
    mockFrom.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      not: mockNot,
      order: mockOrder,
    });

    mockEq.mockReturnValue({
      // head: true returns count
    });

    mockOrder.mockReturnValue({
      limit: mockLimit,
    });

    mockLimit.mockResolvedValue({ data: [] });
  });

  it('should return stats with correct structure', async () => {
    // Mock total, completed, failed, processing counts
    const chainWithCount = (count: number) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count, error: null }),
      }),
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount <= 4) {
        // Count queries
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: [100, 90, 5, 3][callCount - 1], error: null }),
          }),
        };
      }
      // Recent jobs query
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      };
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalRenders');
    expect(data).toHaveProperty('successRate');
    expect(data).toHaveProperty('performanceMetrics');
    expect(data).toHaveProperty('recentActivity');
    expect(typeof data.totalRenders).toBe('number');
    expect(typeof data.successRate).toBe('number');
  });

  it('should handle Supabase errors gracefully', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('RENDER_STATS_ERROR');
    expect(data.error).toBe('Failed to fetch render stats');
  });
});
