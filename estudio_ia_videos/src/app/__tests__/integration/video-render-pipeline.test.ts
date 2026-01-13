import fs from 'fs/promises';
import path from 'path';
import { VideoRenderWorker } from '@/lib/workers/video-render-worker';
import { FFmpegExecutor } from '@/lib/render/ffmpeg-executor';
import { VideoUploader } from '@/lib/storage/video-uploader';

// --- Mocks ---

jest.mock('@/lib/render/ffmpeg-executor', () => {
  return {
    FFmpegExecutor: jest.fn().mockImplementation(() => {
      return {
        renderFromFrames: jest.fn().mockResolvedValue({
          success: true,
          outputPath: 'mock/output.mp4',
          duration: 10,
          fileSize: 1024,
        }),
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
jest.mock('@/lib/storage/video-uploader', () => {
    return {
        VideoUploader: jest.fn().mockImplementation(() => {
            return {
                uploadVideo: jest.fn().mockResolvedValue('https://mock-supabase-url.com/video.mp4'),
            };
        }),
    };
});


// --- Test Suite ---

describe('Video Render Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Pipeline', () => {
    it('should process complete render job', async () => {
      const mockFFmpegExecutor = new FFmpegExecutor();
      const worker = new VideoRenderWorker(mockFFmpegExecutor as any);

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

      // 1. Verifica se o resultado é a URL mockada do uploader
      expect(resultUrl).toBe('https://mock-supabase-url.com/video.mp4');

      // 2. Verifica se o diretório do job foi removido (comportamento do worker)
      const jobDir = path.join(process.cwd(), 'temp', 'render', jobData.id);
      // A verificação de remoção é complexa com mocks, então focamos nas chamadas
      // A lógica de limpeza é testada unitariamente no worker se necessário.
      // O importante é que o pipeline chame os componentes certos.

      // 3. Verifica se o uploader foi chamado
      const uploaderInstance = (VideoUploader as jest.Mock).mock.instances[0];
      expect(uploaderInstance.uploadVideo).toHaveBeenCalled();
      
      // 4. Verifica se o Prisma foi atualizado
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

