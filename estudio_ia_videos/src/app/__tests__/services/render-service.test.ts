import { RenderService } from '@/lib/services/render-service';
import { getVideoRenderWorker } from '@lib/workers/video-render-worker';
import { prisma } from '@lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// Mocks
const mockProcessRenderJob = jest.fn();
jest.mock('@/lib/workers/video-render-worker', () => ({
  getVideoRenderWorker: jest.fn(() => ({
    processRenderJob: mockProcessRenderJob,
  })),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    render_jobs: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-job-id-123'),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RenderService', () => {
  const mockProjectId = 'test-project-123';
  const mockSlides = [{ id: '1', type: 'text', content: 'Test' }];
  const mockUserId = 'user-abc-789';

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.render_jobs.create as jest.Mock).mockResolvedValue({});
    (prisma.render_jobs.update as jest.Mock).mockResolvedValue({});
  });

  it('should successfully queue a render job and return a mocked success', async () => {
    mockProcessRenderJob.mockResolvedValue('https://mock-worker-url.com/video.mp4');

    const result = await RenderService.renderVideo(mockProjectId, mockSlides, mockUserId);

    expect(uuidv4).toHaveBeenCalled();
    expect(prisma.render_jobs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'mock-job-id-123',
        project_id: mockProjectId,
        user_id: mockUserId,
        status: 'queued',
      }),
    });

    expect(mockProcessRenderJob).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mock-job-id-123',
      projectId: mockProjectId,
    }));
    
    expect(prisma.render_jobs.update).toHaveBeenCalledWith({
        where: { id: 'mock-job-id-123' },
        data: { status: 'completed', output_url: 'https://mock-worker-url.com/video.mp4' },
    });

    expect(result).toEqual({
      success: true,
      videoUrl: 'https://mock-worker-url.com/video.mp4',
      s3Key: 'renders/mock-job-id-123/output.mp4',
    });
  });

  it('should handle render errors gracefully and update job status', async () => {
    mockProcessRenderJob.mockRejectedValue(new Error('Worker failed'));

    const result = await RenderService.renderVideo(mockProjectId, mockSlides, mockUserId);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Worker failed');

    // Check that the initial creation happened
    expect(prisma.render_jobs.create).toHaveBeenCalled();
    
    // Check that the update to 'failed' status happened
    expect(prisma.render_jobs.update).toHaveBeenCalledWith({
        where: { id: 'mock-job-id-123' },
        data: { status: 'failed', error_message: 'Worker failed' },
    });
  });
});
