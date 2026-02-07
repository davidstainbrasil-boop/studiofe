/**
 * Tests for render status API route
 * Tests: real Supabase lookup, 404 handling, error responses
 */

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
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

import { GET } from '@/app/api/render/status/[jobId]/route';
import { NextRequest } from 'next/server';

const createRequest = (jobId: string) => {
  return new NextRequest(new URL(`http://localhost:3000/api/render/status/${jobId}`));
};

describe('GET /api/render/status/[jobId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it('should return job status when found', async () => {
    const mockJob = {
      id: 'job-123',
      status: 'completed',
      progress: 100,
      output_url: 'https://storage.example.com/video.mp4',
      error_message: null,
      created_at: '2026-01-01T00:00:00Z',
      started_at: '2026-01-01T00:00:01Z',
      completed_at: '2026-01-01T00:01:00Z',
      render_settings: {},
    };

    mockSingle.mockResolvedValue({ data: mockJob, error: null });

    const response = await GET(
      createRequest('job-123'),
      { params: Promise.resolve({ jobId: 'job-123' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobId).toBe('job-123');
    expect(data.status).toBe('completed');
    expect(data.progress).toBe(100);
    expect(data.videoUrl).toBe('https://storage.example.com/video.mp4');
  });

  it('should return 404 when job not found', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' },
    });

    const response = await GET(
      createRequest('nonexistent'),
      { params: Promise.resolve({ jobId: 'nonexistent' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.code).toBe('JOB_NOT_FOUND');
  });

  it('should return processing job with progress', async () => {
    const mockJob = {
      id: 'job-456',
      status: 'processing',
      progress: 65,
      output_url: null,
      error_message: null,
      created_at: '2026-01-01T00:00:00Z',
      started_at: '2026-01-01T00:00:01Z',
      completed_at: null,
      render_settings: {},
    };

    mockSingle.mockResolvedValue({ data: mockJob, error: null });

    const response = await GET(
      createRequest('job-456'),
      { params: Promise.resolve({ jobId: 'job-456' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('processing');
    expect(data.progress).toBe(65);
    expect(data.videoUrl).toBeUndefined();
  });

  it('should handle database errors', async () => {
    mockSingle.mockRejectedValue(new Error('Connection refused'));

    const response = await GET(
      createRequest('job-789'),
      { params: Promise.resolve({ jobId: 'job-789' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('RENDER_STATUS_ERROR');
  });
});
