import { RenderService } from '@/lib/services/render-service';
import { prisma } from '@/lib/prisma';
import { VideoRenderWorker } from '@lib/workers/video-render-worker';

// Mocks
jest.mock('@/lib/prisma', () => ({
  prisma: {
    render_jobs: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@lib/workers/video-render-worker', () => {
  return {
    VideoRenderWorker: jest.fn().mockImplementation(() => ({
      processRenderJob: jest.fn(),
    })),
  };
});

jest.mock('uuid', () => ({
  v4: () => 'mock-job-id',
}));

describe('RenderService', () => {
  let workerMock: jest.Mocked<VideoRenderWorker>;

  beforeEach(() => {
    jest.clearAllMocks();
    workerMock = new VideoRenderWorker() as jest.Mocked<VideoRenderWorker>;
  });

  it('should create a render job and process it successfully', async () => {
    const projectId = 'proj-1';
    const userId = 'user-1';
    const slides: any[] = [{ id: 's1', duration: 5 }];
    const expectedUrl = 'http://video.url';

    // Configurar mocks
    (workerMock.processRenderJob as jest.Mock).mockResolvedValue(expectedUrl);
    (prisma.render_jobs.create as jest.Mock).mockResolvedValue({ id: 'mock-job-id' });
    (prisma.render_jobs.update as jest.Mock).mockResolvedValue({});

    const result = await RenderService.renderVideo(projectId, slides, userId, workerMock);

    expect(result.success).toBe(true);
    expect(result.videoUrl).toBe(expectedUrl);
    
    expect(prisma.render_jobs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        id: 'mock-job-id',
        projectId,
        userId,
        status: 'pending'
      })
    }));

    expect(workerMock.processRenderJob).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mock-job-id',
      projectId
    }));

    expect(prisma.render_jobs.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mock-job-id' },
      data: expect.objectContaining({
        status: 'completed',
        outputUrl: expectedUrl
      })
    }));
  });

  it('should handle render failure', async () => {
    const projectId = 'proj-1';
    const userId = 'user-1';
    const slides: any[] = [];
    const errorMsg = 'Render failed';

    (workerMock.processRenderJob as jest.Mock).mockRejectedValue(new Error(errorMsg));
    (prisma.render_jobs.create as jest.Mock).mockResolvedValue({ id: 'mock-job-id' });

    const result = await RenderService.renderVideo(projectId, slides, userId, workerMock);

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMsg);

    expect(prisma.render_jobs.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mock-job-id' },
      data: expect.objectContaining({
        status: 'failed',
        errorMessage: errorMsg
      })
    }));
  });
});
