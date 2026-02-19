/**
 * Tests for render status API route
 * Tests: Prisma lookup, auth, 404 handling, error responses
 */

const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();

jest.mock('@lib/auth/safe-auth', () => ({
  getAuthenticatedUserId: jest.fn().mockResolvedValue({
    authenticated: true,
    userId: 'test-user-123',
    status: 200,
  }),
}));

jest.mock('@lib/prisma', () => ({
  prisma: {
    render_jobs: {
      findUnique: mockFindUnique,
    },
    project_collaborators: {
      findFirst: mockFindFirst,
    },
  },
}));

jest.mock('@lib/queue/render-queue', () => ({
  getVideoJobStatus: jest.fn().mockResolvedValue({
    status: 'completed',
    progress: 100,
    error: null,
  }),
}));

jest.mock('@/lib/rate-limit', () => ({
  applyRateLimit: jest.fn().mockResolvedValue(null),
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
    mockFindFirst.mockResolvedValue(null); // not a collaborator by default
  });

  it('should return job status when found', async () => {
    // Owner === auth user → canViewJob passes
    mockFindUnique.mockResolvedValue({
      id: 'job-123',
      projectId: 'project-123',
      status: 'completed',
      progress: 100,
      outputUrl: 'https://storage.example.com/video.mp4',
      errorMessage: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      startedAt: new Date('2026-01-01T00:00:01Z'),
      completedAt: new Date('2026-01-01T00:01:00Z'),
      estimatedDuration: null,
      renderSettings: {},
      settings: null,
      projects: { userId: 'test-user-123' },
    });

    const response = await GET(createRequest('job-123'), {
      params: Promise.resolve({ jobId: 'job-123' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobId).toBe('job-123');
    expect(data.status).toBe('completed');
    expect(data.progress).toBe(100);
    expect(data.videoUrl).toBe('https://storage.example.com/video.mp4');
  });

  it('should return 404 when job not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await GET(createRequest('nonexistent'), {
      params: Promise.resolve({ jobId: 'nonexistent' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.code).toBe('JOB_NOT_FOUND');
  });

  it('should return processing job with progress', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'job-456',
      projectId: 'project-456',
      status: 'processing',
      progress: 65,
      outputUrl: null,
      errorMessage: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      startedAt: new Date('2026-01-01T00:00:01Z'),
      completedAt: null,
      estimatedDuration: null,
      renderSettings: {},
      settings: null,
      projects: { userId: 'test-user-123' },
    });

    const { getVideoJobStatus } = jest.requireMock('@lib/queue/render-queue');
    (getVideoJobStatus as jest.Mock).mockResolvedValueOnce({
      status: 'active',
      progress: 65,
      error: null,
    });

    const response = await GET(createRequest('job-456'), {
      params: Promise.resolve({ jobId: 'job-456' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('processing');
    expect(data.progress).toBe(65);
    expect(data.videoUrl).toBeUndefined();
  });

  it('should handle database errors', async () => {
    mockFindUnique.mockRejectedValue(new Error('Connection refused'));

    const response = await GET(createRequest('job-789'), {
      params: Promise.resolve({ jobId: 'job-789' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('RENDER_STATUS_ERROR');
  });
});
