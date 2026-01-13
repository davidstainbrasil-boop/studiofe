import fs from 'fs/promises';
import path from 'path';
import { VideoRenderWorker } from '@/lib/workers/video-render-worker';
import { FFmpegExecutor } from '@/lib/render/ffmpeg-executor';
import { VideoUploader } from '@/lib/storage/video-uploader';

// --- Mocks ---

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  rename: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockRenderFromFrames = jest.fn().mockResolvedValue({
  success: true,
  outputPath: 'mock/output.mp4',
  duration: 10,
  fileSize: 1024,
});

jest.doMock('@/lib/render/ffmpeg-executor', () => {
  return {
    FFmpegExecutor: jest.fn().mockImplementation(() => {
      return {
        renderFromFrames: mockRenderFromFrames,
      };
    }),
  };
});

// Mock do FrameGenerator para evitar a criação real de imagens
jest.mock('@/lib/render/frame-generator', () => {
    return {
        FrameGenerator: jest.fn().mockImplementation(() => {
            return {
                generateFrames: jest.fn().mockResolvedValue({ success: true, totalFrames: 120 }),
            };
        }),
    };
});

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    render_jobs: {
      findUnique: jest.fn().mockResolvedValue({ id: 'job-123', status: 'processing' }),
      update: jest.fn().mockResolvedValue({}),
    },
    videos: {
      create: jest.fn().mockResolvedValue({ id: 'video-123' }),
    },
  },
}));

// Mock do Supabase Storage (VideoUploader)
const mockUploadVideo = jest.fn().mockResolvedValue('https://mock-supabase-url.com/video.mp4');

jest.mock('@/lib/storage/video-uploader', () => {
    return {
        VideoUploader: jest.fn().mockImplementation(() => {
            return {
                uploadVideo: mockUploadVideo,
            };
        }),
    };
});


// --- Test Suite ---

describe('Video Render Pipeline Integration', () => {
  let worker: VideoRenderWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockFFmpegExecutor = new (require('@/lib/render/ffmpeg-executor').FFmpegExecutor)();
    const mockFrameGenerator = new (require('@/lib/render/frame-generator').FrameGenerator)();
    const mockVideoUploader = new (require('@/lib/storage/video-uploader').VideoUploader)();
    worker = new VideoRenderWorker(mockFFmpegExecutor, mockFrameGenerator, mockVideoUploader);
  });

  describe('Full Pipeline', () => {
    it('should process complete render job', async () => {
      const jobData = {
        id: 'job-123',
        projectId: 'project-123',
        userId: 'test-user-789',
        slides: [
          { estimatedDuration: 1, textBoxes: [{ text: 'Slide 1' }], background: '#fff' },
          { estimatedDuration: 1, textBoxes: [{ text: 'Slide 2' }], background: '#eee' },
        ],
        config: {
          resolution: { width: 1280, height: 720 },
          fps: 30,
          quality: 'medium',
          codec: 'h264',
          format: 'mp4',
        },
      };

      const resultUrl = await worker.processRenderJob(jobData as any);

      expect(resultUrl).toBe('https://mock-supabase-url.com/video.mp4');
      expect(mockRenderFromFrames).toHaveBeenCalledTimes(1);
      const uploaderInstance = new (require('@/lib/storage/video-uploader').VideoUploader)();
      expect(uploaderInstance.uploadVideo).toHaveBeenCalled();
      const { prisma } = require('@/lib/prisma');
      expect(prisma.render_jobs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: jobData.id },
          data: {
            status: 'completed',
            output_url: resultUrl,
          },
        })
      );
    });
  });
});

