/**
 * 🎨 Gerador de Avatares com D-ID - IMPLEMENTAÇÃO REAL
 * Integração com D-ID para geração de avatares falantes
 */

import { logger } from '@/lib/services/logger-service';

const DID_API_KEY = process.env.DID_API_KEY;
const DID_API_URL = 'https://api.d-id.com';

interface DIDTalkOptions {
  sourceUrl: string;
  audioUrl: string;
  driver?: string;
  config?: {
    stitch?: boolean;
    fluent?: boolean;
  };
}

interface DIDTalkResponse {
  id: string;
  status: 'created' | 'processing' | 'done' | 'error';
  result_url?: string;
  error?: string;
  duration?: number;
}

export class DIDService {
  private get apiKey(): string {
    const key = process.env.DID_API_KEY;
    if (!key) {
      throw new Error('DID_API_KEY não está configurada');
    }
    return key;
  }

  constructor() {
    // Constructor doesn't validate - validation deferred to method calls
  }

  /**
   * Cria um vídeo de avatar falante
   */
  async createTalk(options: DIDTalkOptions): Promise<string> {
    try {
      logger.info('DIDService', 'Criando avatar D-ID', { sourceUrl: options.sourceUrl });

      const response = await fetch(`${DID_API_URL}/talks`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_url: options.sourceUrl,
          script: {
            type: 'audio',
            audio_url: options.audioUrl,
          },
          driver_url: options.driver || 'bank://lively',
          config: {
            stitch: options.config?.stitch ?? true,
            fluent: options.config?.fluent ?? true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`D-ID API error: ${error.message || response.statusText}`);
      }

      const data: DIDTalkResponse = await response.json();
      logger.info('DIDService', 'Avatar D-ID criado com sucesso', { talkId: data.id });

      // Aguardar processamento
      const videoUrl = await this.waitForCompletion(data.id);
      return videoUrl;

    } catch (error) {
      logger.error('DIDService', 'Erro ao criar avatar D-ID', error as Error);
      throw error;
    }
  }

  /**
   * Aguarda a conclusão do processamento
   */
  private async waitForCompletion(talkId: string, maxAttempts = 60): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTalkStatus(talkId);

      if (status.status === 'done' && status.result_url) {
        logger.info('DIDService', 'Avatar D-ID processado com sucesso', { talkId });
        return status.result_url;
      }

      if (status.status === 'error') {
        throw new Error(`D-ID processing failed: ${status.error}`);
      }

      // Aguardar 5 segundos antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('D-ID processing timeout');
  }

  /**
   * Obtém o status de um talk
   */
  async getTalkStatus(talkId: string): Promise<DIDTalkResponse> {
    const response = await fetch(`${DID_API_URL}/talks/${talkId}`, {
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get talk status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Deleta um talk
   */
  async deleteTalk(talkId: string): Promise<void> {
    await fetch(`${DID_API_URL}/talks/${talkId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
      },
    });

    logger.info('DIDService', 'Avatar D-ID deletado', { talkId });
  }
}

export const didService = new DIDService();
