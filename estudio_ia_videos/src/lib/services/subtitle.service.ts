/**
 * Subtitle Generation Service
 * Handles automatic subtitle generation using Whisper AI
 */

import { logger } from '@lib/logger';

interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleGenerationResult {
  success: boolean;
  subtitles?: Subtitle[];
  metadata?: {
    language: string;
    model: string;
    duration: number;
    wordCount: number;
  };
  error?: string;
}

export class SubtitleService {
  private openaiApiKey: string | undefined;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Generate subtitles from video using Whisper AI
   */
  async generateSubtitles(
    videoFile: File,
    language: string = 'auto',
    model: string = 'whisper-1',
  ): Promise<SubtitleGenerationResult> {
    try {
      if (!this.openaiApiKey) {
        if (process.env.NODE_ENV !== 'development') {
          throw new Error('OPENAI_API_KEY não configurada para geração de legendas');
        }
        logger.warn('OpenAI API key not configured, using mock data (dev only)', {
          component: 'SubtitleService',
        });
        return this.generateMockSubtitles();
      }

      // Real OpenAI Whisper implementation
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: this.openaiApiKey });

      // Whisper accepts audio files, so we need to extract audio first
      // For now, we'll use the video file directly if it's small enough
      // In production, extract audio using FFmpeg first

      const maxSize = 25 * 1024 * 1024; // 25MB limit for Whisper
      if (videoFile.size > maxSize) {
        throw new Error(
          'Video file too large. Please use a file smaller than 25MB or extract audio first.',
        );
      }

      logger.info('Calling OpenAI Whisper API...', { component: 'SubtitleService' });

      type WhisperTranscription = {
        segments?: Array<{ start: number; end: number; text: string }>;
        language?: string;
        text?: string;
      };

      const timestampGranularities: Array<'segment' | 'word'> = ['segment'];
      const transcription = (await openai.audio.transcriptions.create({
        file: videoFile,
        model,
        language: language === 'auto' ? undefined : language,
        response_format: 'verbose_json',
        timestamp_granularities: timestampGranularities,
      })) as WhisperTranscription;

      // Parse segments into subtitles
      const segments = transcription.segments || [];
      const subtitles = segments.map((segment, index) => ({
        id: index + 1,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text.trim(),
      }));

      // Calculate metadata
      const detectedLanguage = transcription.language || language;
      const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;
      const wordCount = this.countWords(transcription.text || '');

      logger.info(`Generated ${subtitles.length} subtitle segments`, {
        component: 'SubtitleService',
      });

      return {
        success: true,
        subtitles,
        metadata: {
          language: detectedLanguage,
          model,
          duration,
          wordCount,
        },
      };
    } catch (error) {
      logger.error('Subtitle generation error', error as Error, { component: 'SubtitleService' });

      // If it's an API error, provide more context
      if (error instanceof Error) {
        return {
          success: false,
          error: `Failed to generate subtitles: ${error.message}`,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred during subtitle generation',
      };
    }
  }

  /**
   * Export subtitles in various formats
   */
  exportAsSRT(subtitles: Subtitle[]): string {
    return subtitles
      .map((sub, index) => {
        const startTime = this.formatTime(sub.startTime, 'srt');
        const endTime = this.formatTime(sub.endTime, 'srt');
        return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
      })
      .join('\n');
  }

  exportAsVTT(subtitles: Subtitle[]): string {
    const content = subtitles
      .map((sub, index) => {
        const startTime = this.formatTime(sub.startTime, 'vtt');
        const endTime = this.formatTime(sub.endTime, 'vtt');
        return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
      })
      .join('\n');
    return `WEBVTT\n\n${content}`;
  }

  exportAsASS(subtitles: Subtitle[]): string {
    const header = `[Script Info]
Title: Auto-generated subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

    const events = subtitles
      .map((sub) => {
        const startTime = this.formatTime(sub.startTime, 'ass');
        const endTime = this.formatTime(sub.endTime, 'ass');
        return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${sub.text}`;
      })
      .join('\n');

    return header + events;
  }

  /**
   * Format time for different subtitle formats
   */
  private formatTime(seconds: number, format: 'srt' | 'vtt' | 'ass'): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (format === 'srt' || format === 'ass') {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    } else if (format === 'vtt') {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return '';
  }

  /**
   * Generate mock subtitles for testing
   */
  private generateMockSubtitles(): SubtitleGenerationResult {
    const mockSubtitles: Subtitle[] = [
      {
        id: 1,
        startTime: 0,
        endTime: 3.5,
        text: 'Bem-vindo ao sistema de geração automática de legendas',
      },
      {
        id: 2,
        startTime: 3.5,
        endTime: 7.2,
        text: 'Utilizamos inteligência artificial para transcrever seu vídeo',
      },
      {
        id: 3,
        startTime: 7.2,
        endTime: 11,
        text: 'Os resultados possuem precisão superior a 95%',
      },
    ];

    return {
      success: true,
      subtitles: mockSubtitles,
      metadata: {
        language: 'pt-BR',
        model: 'whisper-1',
        duration: 11,
        wordCount: 15,
      },
    };
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }
}

export const subtitleService = new SubtitleService();
