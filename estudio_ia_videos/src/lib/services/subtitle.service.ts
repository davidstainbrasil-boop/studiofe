
/**
 * Subtitle Generation Service
 * Handles automatic subtitle generation using Whisper AI
 */

import { logger } from '@lib/logger';
import fs from 'fs';

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
    videoInput: File | string,
    language: string = 'auto',
    model: string = 'whisper-1',
  ): Promise<SubtitleGenerationResult> {
    try {
      if (!this.openaiApiKey) {
        throw new Error('OPENAI_API_KEY is required for subtitle generation');
      }

      // Real OpenAI Whisper implementation
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: this.openaiApiKey });

      logger.info('Calling OpenAI Whisper API...', { component: 'SubtitleService' });

      type WhisperTranscription = {
        segments?: Array<{ start: number; end: number; text: string }>;
        language?: string;
        text?: string;
      };

      let fileToUpload: any;
      if (typeof videoInput === 'string') {
          fileToUpload = fs.createReadStream(videoInput);
      } else {
          fileToUpload = videoInput;
      }

      const timestampGranularities: Array<'segment' | 'word'> = ['segment'];
      const transcription = (await openai.audio.transcriptions.create({
        file: fileToUpload,
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
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }
}

export const subtitleService = new SubtitleService();
