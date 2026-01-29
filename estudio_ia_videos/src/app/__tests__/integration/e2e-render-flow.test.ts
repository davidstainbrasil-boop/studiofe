
import { mock } from 'node:test';
import { FrameGenerator } from '@/lib/render/frame-generator';
import { VideoRenderWorker } from '@/lib/workers/video-render-worker';
import { FFmpegExecutor } from '@/lib/render/ffmpeg-executor';
import { VideoUploader } from '@/lib/storage/video-uploader';
import { RenderJobData } from '@/lib/queue/types';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/prisma';

// Mock de dependências externas
// jest.mock('@/lib/render/frame-generator');
jest.mock('@/lib/render/ffmpeg-executor');
jest.mock('@/lib/storage/video-uploader');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    render_jobs: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    projects: {
        findUnique: jest.fn(),
    },
    users: {
        findUnique: jest.fn(),
    }
  },
}));

// Mock do FrameGenerator com método estático
jest.mock('@/lib/render/frame-generator', () => {
    return {
        FrameGenerator: class {
            static convertPPTXSlidesToFrames = jest.fn().mockReturnValue([]);
            generateFrames = jest.fn().mockResolvedValue({ 
                success: true, 
                totalFrames: 150, 
                framesDir: 'mock/frames',
                framePaths: Array.from({ length: 150 }, (_, i) => `frame_${i}.png`) 
            });
        }
    };
});

describe('E2E Video Render Flow', () => {
  let videoRenderWorker: VideoRenderWorker;
  let mockFfmpegExecutor: jest.Mocked<FFmpegExecutor>;
  let mockFrameGenerator: any; // Using any because we are mocking the class
  let mockVideoUploader: jest.Mocked<VideoUploader>;

  const tempDir = path.join(process.cwd(), 'temp', 'render-test');

  beforeAll(async () => {
    // Limpeza e criação do diretório temporário
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });
  });

  beforeEach(() => {
    // Resetar mocks antes de cada teste
    jest.clearAllMocks();

    // Instanciar mocks
    const FrameGeneratorClass = require('@/lib/render/frame-generator').FrameGenerator;
    mockFrameGenerator = new FrameGeneratorClass();
    
    mockFfmpegExecutor = new FFmpegExecutor() as jest.Mocked<FFmpegExecutor>;
    mockVideoUploader = new VideoUploader() as jest.Mocked<VideoUploader>;

    // Instanciar o worker com as dependências mockadas - ATENÇÃO À ORDEM
    // constructor(frameGenerator, ffmpegExecutor, videoUploader)
    videoRenderWorker = new VideoRenderWorker(
      mockFrameGenerator,
      mockFfmpegExecutor,
      mockVideoUploader
    );

    // Sobrescrever o diretório temporário do worker para o nosso diretório de teste
    // (videoRenderWorker as any).tempDir = tempDir; // tempDir might not exist on worker anymore

    mockFfmpegExecutor.renderFromFrames.mockImplementation(async (options) => {
      // return success immediately
      return {
        success: true,
        outputPath: options.outputPath,
        duration: 5,
        fileSize: 12345,
      };
    });

    mockVideoUploader.uploadVideo.mockResolvedValue('https://fake-storage.com/video.mp4');

    // Mock do Prisma
    (prisma.render_jobs.update as jest.Mock).mockResolvedValue({
        id: 'test-job-id',
        status: 'completed',
        outputUrl: 'https://fake-storage.com/video.mp4',
    });
    (prisma.render_jobs.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-job-id',
      status: 'processing',
      projectId: 'test-project-id',
      userId: 'test-user-id'
    });
  });

  afterAll(async () => {
    // Limpeza final
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should successfully process a render job from start to finish', async () => {
    // 1. Dados do Job (simulando o que viria da fila)
    const jobData: RenderJobData = {
      id: 'test-job-id',
      projectId: 'test-project-id',
      userId: 'test-user-id',
      slides: [
        { id: 'slide1', content: 'Slide 1', duration: 2 },
        { id: 'slide2', content: 'Slide 2', duration: 3 },
      ],
      config: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'medium',
        codec: 'h264',
        format: 'mp4',
        audioEnabled: true,
        transitionsEnabled: false,
      }
    };

    // 2. Executar o processamento do job
    const finalUrl = await videoRenderWorker.processRenderJob(jobData);

    // 3. Assertivas (Verificações)
    // Verificar se a geração de frames foi chamada
    expect(mockFrameGenerator.generateFrames).toHaveBeenCalledTimes(1);

    // Verificar se a renderização do FFmpeg foi chamada com os parâmetros corretos
    expect(mockFfmpegExecutor.renderFromFrames).toHaveBeenCalledWith(
      expect.objectContaining({
        inputFramesDir: expect.any(String),
        outputPath: expect.stringContaining('render_test-job-id.mp4'), // Changed expectation
        fps: jobData.config.fps,
      })
    );

    // Verificar se o upload do vídeo foi chamado
    expect(mockVideoUploader.uploadVideo).toHaveBeenCalledTimes(1);
    expect(mockVideoUploader.uploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        videoPath: expect.stringContaining('render_test-job-id.mp4'),
        projectId: jobData.projectId,
        userId: jobData.userId,
        jobId: jobData.id,
        metadata: expect.any(Object),
      })
    );

    // Verificar se o status do job foi atualizado no banco de dados
    expect(prisma.render_jobs.update).toHaveBeenCalledWith({
      where: { id: jobData.id },
      data: expect.objectContaining({
        status: 'completed',
        outputUrl: 'https://fake-storage.com/video.mp4',
      }),
    });

    // Verificar se a URL final retornada é a esperada
    expect(finalUrl).toBe('https://fake-storage.com/video.mp4');
  });
});
