
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

export const TranscriptionService = {
  transcribe: async (audioBlob: Blob | File): Promise<TranscriptionResult> => {
    if (!OPENAI_API_KEY) {
      console.warn('TranscriptionService: OPENAI_API_KEY not configured');
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
        segments: data.segments?.map((seg: any) => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })) || [],
      };
    } catch (error) {
      console.error('TranscriptionService error:', error);
      throw error;
    }
  }
};
