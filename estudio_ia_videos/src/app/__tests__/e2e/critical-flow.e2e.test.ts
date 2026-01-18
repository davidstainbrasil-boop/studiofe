/**
 * @jest-environment node
 */

import { randomUUID } from 'crypto';
import { prisma } from '@lib/prisma';
import { AIScriptGeneratorService } from '@lib/ai/script-generator.service';
import { generateProjectTTS } from '@lib/tts-real-integration';
import { VideoRenderWorker } from '@lib/workers/video-render-worker';
import { FFmpegExecutor } from '@lib/render/ffmpeg-executor';
import type { PPTXSlideData } from '@lib/render/frame-generator';

const requireEnv = (key: string) => {
  if (!process.env[key]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
  return process.env[key] as string;
};

const ensurePrerequisites = async () => {
  requireEnv('DATABASE_URL');
  requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  requireEnv('OPENAI_API_KEY');

  const provider = process.env.TTS_PROVIDER || 'elevenlabs';
  if (provider === 'elevenlabs') {
    requireEnv('ELEVENLABS_API_KEY');
  }
  if (provider === 'azure') {
    requireEnv('AZURE_TTS_KEY');
    requireEnv('AZURE_TTS_REGION');
  }

  const ffmpegAvailable = await FFmpegExecutor.checkInstallation();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg não encontrado no ambiente de teste');
  }
};

describe('E2E - Fluxo critico real (roteiro -> TTS -> persistencia -> render)', () => {
  const userId = randomUUID();
  const projectId = randomUUID();
  const jobId = randomUUID();

  beforeAll(async () => {
    await ensurePrerequisites();

    await prisma.auth_users.upsert({
      where: { id: userId },
      update: { email: `e2e-${userId}@estudio.ai` },
      create: {
        id: userId,
        email: `e2e-${userId}@estudio.ai`,
      },
    });

    await prisma.users.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `e2e-${userId}@estudio.ai`,
        name: 'E2E Critical Flow',
        role: 'user',
      },
    });
  });

  afterAll(async () => {
    await prisma.render_jobs.deleteMany({ where: { id: jobId } });
    await prisma.slides.deleteMany({ where: { projectId } });
    await prisma.timelines.deleteMany({ where: { projectId } });
    await prisma.projects.deleteMany({ where: { id: projectId } });
    await prisma.users.deleteMany({ where: { id: userId } });
    await prisma.auth_users.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('executa fluxo critico com persistencia real', async () => {
    const script = await AIScriptGeneratorService.generate({
      nr: 'NR-10',
      topics: ['Procedimentos de segurança', 'Riscos elétricos'],
      duration: 1,
      audience: 'Operadores',
      company_context: 'Industria Metalurgica',
    });

    await prisma.projects.create({
      data: {
        id: projectId,
        userId,
        name: script.title,
        type: 'ai-generated',
        status: 'draft',
        metadata: {
          nr: 'NR-10',
          audience: 'Operadores',
          total_duration: script.total_duration,
        },
      },
    });

    const slidesPayload = script.scenes.map((scene, index) => ({
      id: randomUUID(),
      projectId,
      orderIndex: index + 1,
      title: scene.title,
      content: scene.content,
      duration: Math.max(5, Math.ceil(scene.duration * 60)),
      audioConfig: {
        provider: process.env.TTS_PROVIDER || 'elevenlabs',
        voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      },
      avatarConfig: {
        avatarId: 'default',
        instructions: scene.avatar_instructions,
        visualCues: scene.visual_cues,
        safetyHighlights: scene.safety_highlights,
      },
    }));

    await prisma.slides.createMany({ data: slidesPayload });
    await prisma.timelines.create({
      data: {
        projectId,
        tracks: [],
        totalDuration: slidesPayload.reduce((acc, slide) => acc + (slide.duration || 0), 0),
        version: 1,
      },
    });

    const voiceProvider = (process.env.TTS_PROVIDER === 'azure' ? 'azure' : 'elevenlabs') as
      | 'elevenlabs'
      | 'azure';
    const voiceId =
      voiceProvider === 'azure'
        ? process.env.AZURE_TTS_VOICE_ID || 'pt-BR-FranciscaNeural'
        : process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    const ttsResult = await generateProjectTTS(projectId, { provider: voiceProvider, voiceId });
    if (!ttsResult.success || !ttsResult.audioTimeline?.length) {
      throw new Error(`Falha ao gerar TTS: ${ttsResult.error || 'resultado vazio'}`);
    }

    const slidesWithAudio = await prisma.slides.findMany({ where: { projectId } });
    const hasAudio = slidesWithAudio.some((slide) => {
      const audioConfig = slide.audioConfig as { audioUrl?: string } | null;
      return !!audioConfig?.audioUrl;
    });

    if (!hasAudio) {
      throw new Error('Audio TTS nao persistido nos slides');
    }

    await prisma.render_jobs.create({
      data: {
        id: jobId,
        projectId,
        userId,
        status: 'processing',
        progress: 0,
        renderSettings: {
          resolution: { width: 1280, height: 720 },
          fps: 30,
          quality: 'medium',
          codec: 'h264',
          format: 'mp4',
        },
      },
    });

    const renderSlides = slidesPayload.map((slide) => ({
      id: slide.id,
      content: {
        estimatedDuration: slide.duration,
        textBoxes: [
          {
            text: slide.content || '',
            position: { x: 10, y: 10, width: 80, height: 80 },
          },
        ],
      } as PPTXSlideData,
      duration: slide.duration,
    }));

    const worker = new VideoRenderWorker();
    const outputUrl = await worker.processRenderJob({
      id: jobId,
      projectId,
      userId,
      slides: renderSlides,
      config: {
        resolution: { width: 1280, height: 720 },
        fps: 30,
        quality: 'medium',
        codec: 'h264',
        format: 'mp4',
        audioEnabled: false,
        transitionsEnabled: false,
      },
    });

    if (!outputUrl || /placeholder|mock|fake/i.test(outputUrl)) {
      throw new Error(`Render output invalido: ${outputUrl}`);
    }

    const job = await prisma.render_jobs.findUnique({ where: { id: jobId } });
    if (!job?.outputUrl || job.status !== 'completed') {
      throw new Error('Render job nao foi persistido como completo');
    }
  });
});
