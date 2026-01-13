
import { mock } from 'node:test';
import { FrameGenerator } from '@/lib/render/frame-generator';
import { VideoRenderWorker } from '@/lib/workers/video-render-worker';
import { FFmpegExecutor } from '@/lib/render/ffmpeg-executor';
import { VideoUploader } from '@/lib/storage/video-uploader';
import { RenderJobData } from '@/lib/queue/types';
import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';

// Mock de dependências externas
jest.mock('@/lib/render/frame-generator');
jest.mock('@/lib/render/ffmpeg-executor');
jest.mock('@/lib/storage/video-uploader');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    render_jobs: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('E2E Video Render Flow', () => {
  let videoRenderWorker: VideoRenderWorker;
  let mockFfmpegExecutor: jest.Mocked<FFmpegExecutor>;
  let mockFrameGenerator: jest.Mocked<FrameGenerator>;
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
    mockFrameGenerator = new FrameGenerator() as jest.Mocked<FrameGenerator>;
    mockFfmpegExecutor = new FFmpegExecutor() as jest.Mocked<FFmpegExecutor>;
    mockVideoUploader = new VideoUploader() as jest.Mocked<VideoUploader>;

    // Instanciar o worker com as dependências mockadas
    videoRenderWorker = new VideoRenderWorker(
      mockFfmpegExecutor,
      mockFrameGenerator,
      mockVideoUploader,
      prisma as any,
    );

    // Sobrescrever o diretório temporário do worker para o nosso diretório de teste
    (videoRenderWorker as any).tempDir = tempDir;

    // Mock das implementações
    mockFrameGenerator.generateFrames.mockResolvedValue({
      success: true,
      totalFrames: 150,
      framePaths: Array.from({ length: 150 }, (_, i) => `frame_${i}.png`),
    });

    mockFfmpegExecutor.renderFromFrames.mockImplementation(async (options) => {
      const tempOutputPath = `${options.outputPath}.tmp.mp4`;
      
      // Simula a criação do arquivo temporário pelo FFmpeg
      await fs.writeFile(tempOutputPath, 'fake video data');
      
      // Simula a renomeação para o arquivo final
      await fs.rename(tempOutputPath, options.outputPath);

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
        output_url: 'https://fake-storage.com/video.mp4',
    });
    (prisma.render_jobs.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-job-id',
      status: 'processing',
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
      },
      audioTracks: [
        { slideIndex: 0, audioUrl: 'https://fake-audio.com/audio.mp3', duration: 5 },
      ],
    };

    // Mock para o download do áudio
    // Esta é uma simplificação. Em um cenário real, o método downloadAudio seria mockado.
    jest.spyOn(videoRenderWorker as any, 'downloadAudio').mockResolvedValue(path.join(tempDir, 'downloaded_audio.mp3'));
    jest.spyOn(videoRenderWorker as any, 'concatenateAudio').mockResolvedValue(path.join(tempDir, 'final_audio.mp3'));


    // 2. Executar o processamento do job
    const finalUrl = await videoRenderWorker.processRenderJob(jobData);

    // 3. Assertivas (Verificações)
    // Verificar se a geração de frames foi chamada
    expect(mockFrameGenerator.generateFrames).toHaveBeenCalledTimes(1);

    // Verificar se o download e concatenação de áudio foram chamados
    expect(videoRenderWorker['downloadAudio']).toHaveBeenCalledTimes(1);
    expect(videoRenderWorker['concatenateAudio']).toHaveBeenCalledTimes(1);

    // Verificar se a renderização do FFmpeg foi chamada com os parâmetros corretos
    expect(mockFfmpegExecutor.renderFromFrames).toHaveBeenCalledWith(
      expect.objectContaining({
        inputFramesDir: expect.any(String),
        audioPath: expect.any(String),
        outputPath: expect.stringContaining('output.mp4'),
        fps: jobData.config.fps,
      }),
      expect.any(Function) // onProgress callback
    );

    // Verificar se o upload do vídeo foi chamado
    expect(mockVideoUploader.uploadVideo).toHaveBeenCalledTimes(1);
    expect(mockVideoUploader.uploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        videoPath: expect.stringContaining('output.mp4'),
        projectId: jobData.projectId,
        userId: jobData.userId,
        jobId: jobData.id,
        metadata: expect.any(Object),
      })
    );

    // Verificar se o status do job foi atualizado no banco de dados
    expect(prisma.render_jobs.update).toHaveBeenCalledWith({
      where: { id: jobData.id },
      data: {
        status: 'completed',
        output_url: 'https://fake-storage.com/video.mp4',
      },
    });

    // Verificar se a URL final retornada é a esperada
    expect(finalUrl).toBe('https://fake-storage.com/video.mp4');
  });
});
