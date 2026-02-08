
import { logger } from '@/lib/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  startTime: number;
  endTime: number;
}

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

class TranscriptionServiceImpl {
  private static instance: TranscriptionServiceImpl;
  
  static getInstance(): TranscriptionServiceImpl {
    if (!this.instance) {
      this.instance = new TranscriptionServiceImpl();
    }
    return this.instance;
  }
  
  async transcribe(audioBlob: Blob | File): Promise<TranscriptionResult> {
    if (!OPENAI_API_KEY) {
      logger.warn('TranscriptionService: OPENAI_API_KEY not configured');
      return { text: 'Transcription disabled (no API key)', segments: [] };
    }

    const formData = new FormData();
    formData.append('file', audioBlob);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        text: data.text,
        language: data.language,
        duration: data.duration,
        segments: data.segments?.map((seg: { id: number; start: number; end: number; text: string }) => ({
          id: String(seg.id),
          start: seg.start,
          end: seg.end,
          text: seg.text,
          startTime: seg.start,
          endTime: seg.end,
        })) || [],
      };
    } catch (error) {
      logger.error('TranscriptionService error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Generate subtitles from audio content
   * @param audioUrl - URL or reference to audio file
   * @param duration - Duration of the audio in seconds
   * @param contextText - Optional context text for better accuracy
   */
  async generateSubtitles(
    audioUrl: string, 
    duration: number, 
    contextText?: string | null
  ): Promise<SubtitleSegment[]> {
    try {
      // Fetch audio if it's a URL
      if (audioUrl.startsWith('http') || audioUrl.startsWith('blob:')) {
        const response = await fetch(audioUrl);
        const audioBlob = await response.blob();
        const result = await this.transcribe(audioBlob);
        
        return result.segments.map((seg, idx) => ({
          id: `subtitle-${idx}`,
          text: seg.text,
          startTime: seg.startTime,
          endTime: seg.endTime,
        }));
      }
      
      // If no audio URL, generate segments from context text
      if (contextText) {
        const words = contextText.split(/\s+/);
        const wordsPerSecond = 2.5;
        const segments: SubtitleSegment[] = [];
        const wordsPerSegment = Math.ceil(wordsPerSecond * 3); // ~3 second segments
        
        for (let i = 0; i < words.length; i += wordsPerSegment) {
          const segmentWords = words.slice(i, i + wordsPerSegment);
          const startTime = (i / words.length) * duration;
          const endTime = Math.min(((i + wordsPerSegment) / words.length) * duration, duration);
          
          segments.push({
            id: `subtitle-${segments.length}`,
            text: segmentWords.join(' '),
            startTime,
            endTime,
          });
        }
        
        return segments;
      }
      
      return [];
    } catch (error) {
      logger.error('generateSubtitles error:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
}

export const TranscriptionService = {
  transcribe: async (audioBlob: Blob | File): Promise<TranscriptionResult> => {
    return TranscriptionServiceImpl.getInstance().transcribe(audioBlob);
  },
  
  getInstance: (): TranscriptionServiceImpl => {
    return TranscriptionServiceImpl.getInstance();
  },
  
  generateSubtitles: async (
    audioUrl: string, 
    duration: number, 
    contextText?: string | null
  ): Promise<SubtitleSegment[]> => {
    return TranscriptionServiceImpl.getInstance().generateSubtitles(audioUrl, duration, contextText);
  }
};
