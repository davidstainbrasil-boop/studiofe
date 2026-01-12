/**
 * Tests for Video Render Worker
 */
import { VideoRenderWorker } from '@lib/workers/video-render-worker';
import { prisma } from '@lib/prisma';
import WatermarkProcessor from '@lib/video/watermark-processor';
import { FFmpegExecutor } from '@lib/video/ffmpeg-executor';

// Mock dependencies
jest.mock('@lib/prisma', () => ({
  prisma: {
    videoJob: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@lib/video/watermark-processor');
jest.mock('@lib/video/ffmpeg-executor');

describe('VideoRenderWorker', () => {
  let worker: VideoRenderWorker;
  const mockJobData = {
    id: 'job-123',
    config: {
      fps: 30,
      resolution: { width: 1920, height: 1080 },
      codec: 'h264',
      quality: 'high',
      format: 'mp4',
    },
  };

  beforeEach(() => {
    worker = new VideoRenderWorker();
    jest.clearAllMocks();
  });

  it('should apply watermark if watermark text exists on the job', async () => {
    const watermarkText = 'My Watermark';
    (prisma.videoJob.findUnique as jest.Mock).mockResolvedValue({
      id: mockJobData.id,
      watermark: watermarkText,
    });

    const mockFfmpegExecutor = FFmpegExecutor as jest.MockedClass<typeof FFmpegExecutor>;
    const mockWatermarkProcessor = WatermarkProcessor as jest.MockedClass<typeof WatermarkProcessor>;

    // This is a private method, so we need to bypass TypeScript's checks
    // In a real scenario, we would test the public method that calls this.
    // For this example, we'll call it directly.
    await (worker as any).renderVideo(mockJobData, '/tmp/frames', null, '/tmp/output.mp4', 300);

    expect(prisma.videoJob.findUnique).toHaveBeenCalledWith({
      where: { id: mockJobData.id },
    });

    expect(mockWatermarkProcessor.prototype.process).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        watermarks: expect.arrayContaining([
          expect.objectContaining({
            text: watermarkText,
          }),
        ]),
      })
    );
  });

  it('should not apply watermark if watermark text does not exist on the job', async () => {
    (prisma.videoJob.findUnique as jest.Mock).mockResolvedValue({
      id: mockJobData.id,
      watermark: null,
    });

    const mockWatermarkProcessor = WatermarkProcessor as jest.MockedClass<typeof WatermarkProcessor>;

    await (worker as any).renderVideo(mockJobData, '/tmp/frames', null, '/tmp/output.mp4', 300);

    expect(prisma.videoJob.findUnique).toHaveBeenCalledWith({
      where: { id: mockJobData.id },
    });

    expect(mockWatermarkProcessor.prototype.process).not.toHaveBeenCalled();
  });
});
