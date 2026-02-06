/**
 * API Route: POST /api/pptx-to-video/generate
 *
 * Generates a video from PPTX slides with avatar, voice, music, and subtitles
 * Main endpoint for the PPTXToVideoWizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { randomUUID } from 'crypto';
import { getTTSService } from '@/lib/tts/tts-service-real';
import { FFmpegRenderer } from '@/lib/video/ffmpeg-renderer';
import type { PIPPosition } from '@/lib/video/ffmpeg-renderer';
import { SubtitleGenerator } from '@/lib/subtitles/subtitle-generator';
import { SubtitleBurner } from '@/lib/subtitles/subtitle-burner';
import { AudioMixer } from '@/lib/audio/audio-mixer';
import { getMusicLibrary } from '@/lib/audio/music-library';
import { TalkingHeadPipelineService } from '@/lib/avatar/talking-head-pipeline-service';

export const maxDuration = 300; // 5 minutes max

interface GenerateRequest {
  projectId: string;
  slides: Array<{
    id: string;
    slideNumber: number;
    title: string;
    content: string;
    notes: string;
    imageUrl?: string;
    duration: number;
  }>;
  settings: {
    avatarId?: string;
    avatarProvider?: string;
    avatarMode?: 'none' | 'realistic';
    avatarImageUrl?: string;
    avatarPipPosition?: PIPPosition;
    avatarPipSize?: number;
    voiceId?: string;
    voiceProvider?: string;
    musicId?: string;
    musicVolume?: number;
    subtitlesEnabled?: boolean;
    subtitleStyle?: 'default' | 'netflix' | 'minimal' | 'bold';
    quality?: '720p' | '1080p' | '4k';
    transitionType?: 'fade' | 'slide' | 'none';
    transitionDuration?: number;
  };
}

// In-memory job store (in production, use Redis or database)
const jobStore = new Map<
  string,
  {
    status: 'processing' | 'completed' | 'failed';
    stage: string;
    progress: number;
    message: string;
    currentSlide?: number;
    totalSlides?: number;
    videoUrl?: string;
    subtitlesUrl?: string;
    duration?: number;
    fileSize?: number;
    error?: string;
  }
>();

export async function POST(request: NextRequest) {
  const jobId = randomUUID();

  try {
    const body: GenerateRequest = await request.json();
    const { projectId, slides, settings } = body;

    if (!projectId || !slides || slides.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Projeto ou slides inválidos' },
        { status: 400 }
      );
    }

    if (!settings.voiceId) {
      return NextResponse.json(
        { success: false, message: 'Voz não selecionada' },
        { status: 400 }
      );
    }

    // Initialize job
    jobStore.set(jobId, {
      status: 'processing',
      stage: 'preparing',
      progress: 0,
      message: 'Iniciando geração...',
      totalSlides: slides.length,
    });

    logger.info('Starting video generation', {
      jobId,
      projectId,
      slideCount: slides.length,
      component: 'pptx-to-video-generate',
    });

    // Start generation in background
    generateVideoAsync(jobId, projectId, slides, settings);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Geração iniciada',
    });
  } catch (error) {
    logger.error('Video generation error', error instanceof Error ? error : new Error(String(error)), {
      jobId,
      component: 'pptx-to-video-generate',
    });

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao iniciar geração',
      },
      { status: 500 }
    );
  }
}

async function generateVideoAsync(
  jobId: string,
  projectId: string,
  slides: GenerateRequest['slides'],
  settings: GenerateRequest['settings']
) {
  const updateJob = (update: Partial<typeof jobStore extends Map<string, infer V> ? V : never>) => {
    const current = jobStore.get(jobId);
    if (current) {
      jobStore.set(jobId, { ...current, ...update });
    }
  };

  try {
    const ttsService = getTTSService();
    const subtitleGenerator = new SubtitleGenerator();
    const useRealisticAvatar = settings.avatarMode === 'realistic' && !!settings.avatarImageUrl;

    // Step 1: Generate TTS for all slides (0-25% of progress)
    updateJob({ stage: 'tts', progress: 2, message: 'Gerando narração...' });

    const audioResults: Array<{ slideId: string; audioUrl: string; duration: number }> = [];
    const slideTexts: Array<{ notes: string; title?: string; duration?: number }> = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const text = slide.notes || slide.content || slide.title;

      updateJob({
        currentSlide: i + 1,
        progress: 2 + Math.round((i / slides.length) * 23),
        message: `Gerando narração do slide ${i + 1}/${slides.length}...`,
      });

      const ttsResult = await ttsService.generate({
        text,
        voiceId: settings.voiceId,
        provider: settings.voiceProvider as 'elevenlabs' | 'azure' | 'edge' | undefined,
      });

      if (ttsResult.success) {
        audioResults.push({
          slideId: slide.id,
          audioUrl: ttsResult.audioUrl,
          duration: ttsResult.duration || slide.duration,
        });
        slideTexts.push({
          notes: text,
          title: slide.title,
          duration: (ttsResult.duration || slide.duration) * 1000,
        });
      }
    }

    // Step 2: Generate talking-head avatar videos (25-55% of progress)
    // Map slideId -> local avatar video path
    const avatarVideoPaths = new Map<string, string>();

    if (useRealisticAvatar) {
      updateJob({ stage: 'avatar', progress: 25, message: 'Gerando avatar com lip-sync...' });

      const avatarRequests = audioResults.map((ar) => ({
        slideId: ar.slideId,
        sourceImage: settings.avatarImageUrl!,
        audioUrl: ar.audioUrl,
      }));

      const avatarResults = await TalkingHeadPipelineService.generateForSlides(
        avatarRequests,
        (completed, total, slideId) => {
          updateJob({
            stage: 'avatar',
            currentSlide: completed,
            progress: 25 + Math.round((completed / total) * 30),
            message: `Gerando avatar slide ${completed}/${total}...`,
          });
        }
      );

      for (const result of avatarResults) {
        if (result.success && result.localVideoPath) {
          avatarVideoPaths.set(result.slideId, result.localVideoPath);
        }
      }

      logger.info('Avatar generation complete', {
        jobId,
        total: avatarResults.length,
        succeeded: avatarResults.filter((r) => r.success).length,
        component: 'pptx-to-video-generate',
      });
    }

    // Step 3: Generate subtitles if enabled (55-60%)
    let subtitlesUrl: string | undefined;
    let subtitleFilePath: string | undefined;

    if (settings.subtitlesEnabled) {
      updateJob({ stage: 'subtitles', progress: 55, message: 'Gerando legendas...' });

      const subtitleResult = subtitleGenerator.generateFromSlideNotes(slideTexts, 'srt');

      const tempSubtitlePath = `/tmp/subtitles-${jobId}.srt`;
      const fs = await import('fs/promises');
      await fs.writeFile(tempSubtitlePath, subtitleResult.content);
      subtitleFilePath = tempSubtitlePath;

      subtitlesUrl = `/api/subtitles/download/${jobId}`;
    }

    // Step 4: Render video with slides, audio, and avatar PIP (55-70%)
    updateJob({ stage: 'composing', progress: 58, message: 'Compondo vídeo...' });

    const qualityConfig = getQualityConfig(settings.quality || '1080p');

    const slideData = slides.map((slide, index) => ({
      id: slide.id,
      title: slide.title,
      content: slide.content,
      duration: audioResults[index]?.duration || slide.duration,
      audioUrl: audioResults[index]?.audioUrl,
      backgroundImage: slide.imageUrl,
      avatarVideoPath: avatarVideoPaths.get(slide.id),
    }));

    const pipConfig = useRealisticAvatar
      ? {
          position: settings.avatarPipPosition || ('bottom-right' as const),
          size: settings.avatarPipSize || 0.25,
        }
      : undefined;

    const renderResult = await FFmpegRenderer.renderVideo(slideData, projectId, qualityConfig, pipConfig);

    if (!renderResult.success) {
      throw new Error(renderResult.error || 'Falha na renderização');
    }

    let finalVideoPath = renderResult.videoPath!;
    let finalVideoUrl = renderResult.videoUrl!;

    // Step 5: Burn in subtitles if enabled (70-80%)
    if (settings.subtitlesEnabled && subtitleFilePath) {
      updateJob({ stage: 'subtitles', progress: 72, message: 'Adicionando legendas ao vídeo...' });

      try {
        const burner = new SubtitleBurner();
        const burnResult = await burner.burn({
          videoPath: renderResult.videoPath!,
          subtitlePath: subtitleFilePath,
          outputPath: renderResult.videoPath!.replace('.mp4', '_subs.mp4'),
          style: settings.subtitleStyle || 'default',
        });

        if (burnResult.success) {
          finalVideoPath = burnResult.outputPath!;
          finalVideoUrl = finalVideoUrl.replace('.mp4', '_subs.mp4');
        }
      } catch (burnError) {
        logger.warn('Subtitle burn failed, continuing without burn-in', {
          error: burnError,
          component: 'pptx-to-video-generate',
        });
      }
    }

    // Step 6: Mix background music if selected (80-90%)
    if (settings.musicId) {
      updateJob({ stage: 'music', progress: 82, message: 'Mixando música de fundo...' });

      try {
        const musicLibrary = getMusicLibrary();
        const track = musicLibrary.getTrack(settings.musicId);

        if (track) {
          const mixer = new AudioMixer();
          const mixResult = await mixer.mixVideoWithMusic({
            videoPath: finalVideoPath,
            musicPath: track.url,
            outputPath: finalVideoPath.replace('.mp4', '_music.mp4'),
            musicVolume: (settings.musicVolume || 20) / 100,
            duckingEnabled: true,
            duckingLevel: 0.2,
          });

          if (mixResult.success) {
            finalVideoPath = mixResult.outputPath!;
            finalVideoUrl = finalVideoUrl.replace('.mp4', '_music.mp4');
          }
        }
      } catch (mixError) {
        logger.warn('Music mixing failed, continuing without background music', {
          error: mixError,
          component: 'pptx-to-video-generate',
        });
      }
    }

    // Step 7: Finalize (90-100%)
    updateJob({ stage: 'finalizing', progress: 92, message: 'Finalizando...' });

    const fs = await import('fs/promises');
    const stats = await fs.stat(finalVideoPath);

    updateJob({
      status: 'completed',
      stage: 'complete',
      progress: 100,
      message: 'Vídeo gerado com sucesso!',
      videoUrl: finalVideoUrl,
      subtitlesUrl,
      duration: renderResult.duration,
      fileSize: stats.size,
    });

    logger.info('Video generation completed', {
      jobId,
      projectId,
      duration: renderResult.duration,
      fileSize: stats.size,
      avatarMode: settings.avatarMode || 'none',
      component: 'pptx-to-video-generate',
    });
  } catch (error) {
    logger.error('Video generation failed', error instanceof Error ? error : new Error(String(error)), {
      jobId,
      projectId,
      component: 'pptx-to-video-generate',
    });

    updateJob({
      status: 'failed',
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Erro na geração',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

function getQualityConfig(quality: '720p' | '1080p' | '4k') {
  const configs = {
    '720p': { width: 1280, height: 720, videoBitrate: '3000k' },
    '1080p': { width: 1920, height: 1080, videoBitrate: '5000k' },
    '4k': { width: 3840, height: 2160, videoBitrate: '15000k' },
  };
  return configs[quality];
}

// Export job store for status route
export { jobStore };
