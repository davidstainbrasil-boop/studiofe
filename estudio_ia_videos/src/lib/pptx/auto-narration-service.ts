/**
 * Auto Narration Service
 * Geração automática de narração para slides PPTX
 */

import { generateAndUploadTTSAudio } from '@lib/elevenlabs-service';
import { logger } from '@lib/logger';

export interface NarrationOptions {
  provider?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  language?: string;
  emotion?: 'neutral' | 'professional' | 'enthusiastic';
  preferNotes?: boolean;
}

export interface NarrationResult {
  audioBuffer: Buffer;
  duration: number;
  transcript: string;
}

export interface SlideData {
  slideNumber: number;
  notes?: string;
  elements: unknown[];
}

export interface NarrationOutput {
  slideNumber: number;
  audioUrl: string;
  script: string;
  provider: string;
  voice: string;
  duration: number;
}

export interface BatchNarrationResult {
  success: boolean;
  narrations: NarrationOutput[];
  totalDuration: number;
  error?: string;
}

export class AutoNarrationService {
  async generateForSlide(slideText: string, options?: NarrationOptions): Promise<NarrationResult> {
    logger.info('[AutoNarration] Generating narration for slide (Real)', { component: 'AutoNarrationService' });
    
    try {
      const voiceId = options?.voice || '21m00Tcm4TlvDq8ikWAM';
      const audioBuffer = await generateTTSAudio(slideText, voiceId);
      
      // Calculate duration roughly as we don't parse the MP3 headers here
      // For higher precision we would need 'mp3-duration' or similar lib
      // Buffer length / bit rate estimate? 
      // MP3 128kbps = 16KB/s approximately.
      const durationSeconds = (audioBuffer.byteLength) / 16000; 

      return {
        audioBuffer: Buffer.from(audioBuffer),
        duration: Math.round(durationSeconds * 1000),
        transcript: slideText,
      };
    } catch (error) {
       logger.error('Error generating slide narration', error);
       throw error;
    }
  }
  
  async generateForPresentation(slides: string[], options?: NarrationOptions): Promise<NarrationResult[]> {
    logger.info('[AutoNarration] Generating narration for presentation (Real)', { component: 'AutoNarrationService', count: slides.length });
    
    // Use Promise.all with simple concurrency limit could be added if needed, but for now sequential or parallel
    // Mapping all might hit rate limits if too many.
    const results: NarrationResult[] = [];
    
    for (const text of slides) {
        if (!text || !text.trim()) {
            results.push({ audioBuffer: Buffer.from([]), duration: 0, transcript: '' });
            continue;
        }
        const result = await this.generateForSlide(text, options);
        results.push(result);
    }
    
    return results;
  }

  /**
   * Gera narrações para um conjunto de slides
   */
  async generateNarrations(
    slides: SlideData[],
    projectId: string,
    options: NarrationOptions
  ): Promise<BatchNarrationResult> {
    try {
      logger.info(`Iniciando geração de narração para projeto ${projectId}`, { component: 'AutoNarrationService', slideCount: slides.length });
      
      const narrations: NarrationOutput[] = [];
      let totalDuration = 0;

      for (const slide of slides) {
        // Determinar texto a ser narrado
        let textToNarrate = '';
        
        if (options.preferNotes && slide.notes && slide.notes.trim().length > 0) {
          textToNarrate = slide.notes;
        } else {
          // Extrair texto dos elementos do slide se não houver notas ou preferNotes for false
          // Simplificação: concatenar textos encontrados nos elementos
          const elements = slide.elements as Array<{ type: string; text?: string; content?: string }>;
          textToNarrate = elements
            .filter(el => (el.type === 'text' || el.type === 'shape') && (el.text || el.content))
            .map(el => el.text || el.content)
            .join('. ');
        }

        if (!textToNarrate || textToNarrate.trim().length === 0) {
          logger.warn(`Slide ${slide.slideNumber} sem texto para narrar. Pulando.`, { component: 'AutoNarrationService' });
          continue;
        }

        // Limitar tamanho do texto se necessário
        if (textToNarrate.length > 5000) {
          textToNarrate = textToNarrate.substring(0, 5000);
        }

        try {
          // Gerar áudio usando ElevenLabs (ou outro provider se implementado)
          // Por enquanto forçamos ElevenLabs se o provider for 'elevenlabs' ou default
          // Se for 'azure', poderíamos ter outro serviço, mas vamos usar ElevenLabs como fallback ou principal
          
          const fileName = `${projectId}/slide-${slide.slideNumber}-${Date.now()}.mp3`;
          
          // Usar voz padrão se não especificada
          const voiceId = options.voice || '21m00Tcm4TlvDq8ikWAM'; // Rachel
          
          const audioUrl = await generateAndUploadTTSAudio(
            textToNarrate,
            fileName,
            voiceId
          );

          // Estimativa de duração (se a API não retornar, podemos estimar pelo tamanho do texto ou obter metadados do arquivo)
          // Para precisão, precisaríamos ler o arquivo ou a API retornar a duração.
          // ElevenLabsService generateTTSAudio retorna Buffer, mas generateAndUploadTTSAudio retorna URL.
          // Vamos assumir uma estimativa baseada em palavras por minuto (avg 150 wpm)
          const wordCount = textToNarrate.split(/\s+/).length;
          const estimatedDuration = Math.ceil((wordCount / 150) * 60 * 1000); // ms

          narrations.push({
            slideNumber: slide.slideNumber,
            audioUrl,
            script: textToNarrate,
            provider: 'elevenlabs',
            voice: voiceId,
            duration: estimatedDuration
          });

          totalDuration += estimatedDuration;
          
          logger.info(`Narração gerada para slide ${slide.slideNumber}`, { component: 'AutoNarrationService' });

        } catch (err) {
          logger.error(`Erro ao gerar narração para slide ${slide.slideNumber}`, err instanceof Error ? err : new Error(String(err)), { component: 'AutoNarrationService' });
          // Continuar para o próximo slide mesmo com erro
        }
      }

      return {
        success: true,
        narrations,
        totalDuration
      };

    } catch (error) {
      logger.error('Erro fatal na geração de narrações', error instanceof Error ? error : new Error(String(error)), { component: 'AutoNarrationService' });
      return {
        success: false,
        narrations: [],
        totalDuration: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export const autoNarrationService = new AutoNarrationService();

