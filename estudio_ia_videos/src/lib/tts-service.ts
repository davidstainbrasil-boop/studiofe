import { synthesizeToFile, listVoices, TTSOptions, TTSResult } from './tts/tts-service';

export class TTSService {
  static async synthesize(text: string, options: { voiceId?: string; format?: 'mp3' | 'wav' } = {}): Promise<TTSResult> {
    const ttsOptions: TTSOptions = {
      text,
      voiceId: options.voiceId,
      format: options.format as any // Cast if types slightly differ, or ensure compatibility
    };
    return synthesizeToFile(ttsOptions);
  }

  static async getVoices() {
    return listVoices();
  }

  static getAvailableVoices(language: string) {
    // Legacy method for compatibility, but could be updated to filter the real list
    return [
      { id: 'pt-BR-FranciscaNeural', name: 'Francisca (Neural)', language: 'pt-BR', gender: 'Female' },
      { id: 'pt-BR-AntonioNeural', name: 'Antonio (Neural)', language: 'pt-BR', gender: 'Male' }
    ];
  }
}

export * from './tts/tts-service';
