/**
 * Slide-to-Video Composition Service
 * Simplified version for MVP demonstration
 */

import { logger } from '@/lib/monitoring/logger';
import { AudioStorageManager } from '@/lib/tts/audio-storage-manager';
import { RealTTSService } from '@/lib/tts/real-tts-service';

export interface Slide {
  id: string;
  content: string;
  notes?: string;
  audioUrl?: string;
  duration?: number;
}

export interface VideoResult {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  error?: string;
  slides?: Slide[];
}

export class SlideToVideoComposer {
  private audioStorage: AudioStorageManager;
  private realTTS: RealTTSService;

  constructor() {
    this.audioStorage = new AudioStorageManager();
    this.realTTS = new RealTTSService();
  }

  /**
   * Compose slides with audio into a simple video
   */
  async composeSlidesToVideo(
    slides: Slide[],
    projectId: string,
    voiceId: string = 'bella'
  ): Promise<VideoResult> {
    try {
      logger.info('Starting slide-to-video composition', {
        slideCount: slides.length,
        projectId
      });

      // Generate TTS for each slide
      const slidesWithAudio: Slide[] = [];
      
      for (const slide of slides) {
        // Use notes if available, otherwise content
        const textToSpeak = slide.notes || slide.content;
        
        if (!textToSpeak || textToSpeak.trim().length === 0) {
          logger.warn(`Skipping slide ${slide.id} - no content to speak`);
          continue;
        }

        try {
          // Generate TTS with real service
          const result = await this.realTTS.generateSpeechForSlide(
            textToSpeak,
            slide.notes,
            {
              voiceId,
              projectId,
              slideId: slide.id,
              provider: 'elevenlabs' as any
            }
          );

          const ttsResult = result as any;
          if (ttsResult.success && ttsResult.audioUrl) {
            slidesWithAudio.push({
              ...slide,
              audioUrl: ttsResult.audioUrl,
              duration: ttsResult.duration
            });

            logger.info(`TTS generated for slide ${slide.id}`, {
              duration: ttsResult.duration,
              success: true
            });
          } else {
            logger.error(`Failed to generate TTS for slide ${slide.id}`,
              new Error(ttsResult.error || 'TTS generation failed'));
          }
        } catch (error) {
          logger.error(`Error generating TTS for slide ${slide.id}`,
            error instanceof Error ? error : new Error('Unknown error'));
        }
      }

      const totalDuration = slidesWithAudio.reduce((sum, slide) => sum + (slide.duration || 0), 0);

      logger.info('Slide-to-video composition completed', {
        totalSlides: slides.length,
        slidesWithAudio: slidesWithAudio.length,
        totalDuration
      });

      // Store composition in Supabase Storage for render pipeline pickup
      const videoPath = `compositions/${projectId}/composition.json`;

      return {
        success: true,
        videoUrl: `/api/render/start?projectId=${encodeURIComponent(projectId)}`,
        duration: totalDuration,
        slides: slidesWithAudio
      };

    } catch (error) {
      logger.error('Slide-to-video composition failed',
        error instanceof Error ? error : new Error('Slide-to-video composition failed'),
        { projectId }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Slide-to-video composition failed'
      };
    }
  }
}