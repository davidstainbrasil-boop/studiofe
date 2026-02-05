/**
 * 🎬 Pipeline PPTX → Vídeo E2E Service
 * Orquestra o fluxo completo do diferencial do produto
 */

import { logger } from '@/lib/monitoring/logger';
import { prisma } from '@/lib/prisma';
import { PptxUploader } from '@/lib/storage/pptx-uploader';
import PPTXProcessorReal from '@/lib/pptx/pptx-processor-real';

interface PptxToVideoOptions {
  userId: string;
  file: File;
  projectName: string;
  voiceId?: string;
  ttsProvider?: 'elevenlabs' | 'azure' | 'google' | 'mock';
  avatarId?: string;
  resolution?: '720p' | '1080p' | '4k';
  generateSubtitles?: boolean;
}

interface PipelineResult {
  projectId: string;
  jobId?: string;
  slides: Array<{
    id: string;
    content: string;
    notes?: string;
    audioUrl?: string;
    duration?: number;
  }>;
  status: 'slides_extracted' | 'tts_generated' | 'render_started' | 'completed' | 'failed';
  estimatedTime?: number;
}

export class PptxToVideoService {
  
  /**
   * Executa o pipeline completo PPTX → Vídeo
   */
  async processPptxToVideo(options: PptxToVideoOptions): Promise<PipelineResult> {
    const { userId, file, projectName, voiceId, ttsProvider = 'mock', avatarId, resolution = '1080p' } = options;
    
    logger.info('🎬 Iniciando pipeline PPTX → Vídeo', {
      component: 'PptxToVideoService',
      userId,
      projectName,
      fileSize: file.size,
      ttsProvider
    });

    try {
      // Fase 1: Upload e extração dos slides
      const uploadResult = await this.uploadAndExtractSlides(userId, file, projectName);
      
      if (!uploadResult.success || !uploadResult.slides) {
        throw new Error('Falha na extração dos slides');
      }

      // Fase 2: Geração de TTS para cada slide
      const slidesWithAudio = await this.generateTTSForSlides(
        uploadResult.slides,
        { voiceId, provider: ttsProvider }
      );

      // Fase 3: Iniciar renderização
      const renderJob = await this.startRenderJob(uploadResult.projectId, slidesWithAudio, {
        resolution,
        avatarId,
        generateSubtitles: options.generateSubtitles
      });

      logger.info('✅ Pipeline iniciado com sucesso', {
        component: 'PptxToVideoService',
        projectId: uploadResult.projectId,
        slidesCount: slidesWithAudio.length,
        jobId: renderJob?.id
      });

      return {
        projectId: uploadResult.projectId,
        jobId: renderJob?.id,
        slides: slidesWithAudio,
        status: renderJob ? 'render_started' : 'tts_generated',
        estimatedTime: this.calculateEstimatedTime(slidesWithAudio)
      };

    } catch (error) {
      logger.error('❌ Erro no pipeline PPTX → Vídeo', error instanceof Error ? error : new Error(String(error)), {
        component: 'PptxToVideoService',
        userId,
        projectName
      });
      
      return {
        projectId: '',
        slides: [],
        status: 'failed'
      };
    }
  }

  /**
   * Fase 1: Upload e extração dos slides do PPTX
   */
  private async uploadAndExtractSlides(userId: string, file: File, projectName: string) {
    logger.info('📤 Fase 1: Upload e extração de slides', { component: 'PptxToVideoService' });

    try {
      // Converter File para Buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Criar projeto no banco primeiro
      const project = await prisma.projects.create({
        data: {
          name: projectName,
          userId,
          status: 'in_progress',
          metadata: {
            slideCount: 0,
            originalFile: file.name,
            createdVia: 'pptx_pipeline'
          }
        }
      });

      // Processar PPTX
      const extractionResult = await PPTXProcessorReal.extract(buffer, project.id);
      
      if (!extractionResult.success) {
        throw new Error('Falha na extração PPTX');
      }

      // Atualizar metadata do projeto com slideCount real
      await prisma.projects.update({
        where: { id: project.id },
        data: {
          metadata: {
            tags: [],
            category: "general", 
            priority: "medium",
            custom_fields: {},
            slideCount: extractionResult.slides?.length || 0,
          }
        }
      });

      // Processar slides extraídos
      const slides = extractionResult.slides?.map((slide: any, index: number) => ({
        id: `slide-${index + 1}`,
        content: slide.content || `Slide ${index + 1}`,
        notes: slide.notes || '',
        order: index,
        projectId: project.id
      })) || [];

      logger.info('✅ Slides extraídos com sucesso', {
        component: 'PptxToVideoService',
        projectId: project.id,
        slidesCount: slides.length
      });

      return {
        success: true,
        projectId: project.id,
        slides
      };

    } catch (error) {
      logger.error('❌ Erro na extração de slides', error instanceof Error ? error : new Error(String(error)), {
        component: 'PptxToVideoService'
      });
      
      return {
        success: false,
        projectId: '',
        slides: []
      };
    }
  }

  /**
   * Fase 2: Gerar TTS para cada slide
   */
  private async generateTTSForSlides(
    slides: Array<{ id: string; content: string; notes?: string }>,
    ttsOptions: { voiceId?: string; provider: string }
  ) {
    logger.info('🎙️ Fase 2: Geração de TTS', { 
      component: 'PptxToVideoService',
      slidesCount: slides.length,
      provider: ttsOptions.provider
    });

    const slidesWithAudio = [];

    for (const slide of slides) {
      try {
        // Usar notes se disponível, senão usar content
        const textToNarrate = slide.notes || slide.content;
        
        if (!textToNarrate || textToNarrate.trim().length === 0) {
          slidesWithAudio.push({
            ...slide,
            duration: 3 // 3 segundos padrão para slides sem texto
          });
          continue;
        }

        // Gerar TTS
        const ttsResult = await this.generateTTS(textToNarrate, ttsOptions);
        
        slidesWithAudio.push({
          ...slide,
          audioUrl: ttsResult.audioUrl,
          duration: ttsResult.duration
        });

        logger.info(`✅ TTS gerado para slide ${slide.id}`, {
          component: 'PptxToVideoService',
          duration: ttsResult.duration
        });

      } catch (error) {
        logger.error(`❌ Erro TTS slide ${slide.id}`, error instanceof Error ? error : new Error(String(error)), {
          component: 'PptxToVideoService'
        });
        
        // Fallback: slide sem áudio
        slidesWithAudio.push({
          ...slide,
          duration: 5 // 5 segundos padrão
        });
      }
    }

    return slidesWithAudio;
  }

  /**
   * Fase 3: Iniciar job de renderização
   */
  private async startRenderJob(
    projectId: string,
    slides: Array<any>,
    renderOptions: {
      resolution: string;
      avatarId?: string;
      generateSubtitles?: boolean;
    }
  ) {
    logger.info('🎬 Fase 3: Iniciando render job', {
      component: 'PptxToVideoService',
      projectId,
      slidesCount: slides.length
    });

    try {
      // Criar job no banco
      const renderJob = await prisma.render_jobs.create({
        data: {
          projectId,
          userId: '', // Será preenchido no endpoint
          status: 'pending',
          renderSettings: {
            resolution: renderOptions.resolution,
            avatarId: renderOptions.avatarId,
            generateSubtitles: renderOptions.generateSubtitles || false,
            slides: slides.map(slide => ({
              id: slide.id,
              content: slide.content,
              audioUrl: slide.audioUrl,
              duration: slide.duration || 5
            }))
          },
          settings: {}
        }
      });

      // Adicionar à fila BullMQ - IMPLEMENTAÇÃO REAL
      try {
        const { addVideoJob } = await import('@/lib/queue/render-queue');
        const jobId = await addVideoJob({
          jobId: renderJob.id,
          projectId,
          userId: '', // Será preenchido no endpoint
          slides: slides.map(slide => ({
            id: slide.id,
            content: slide.content,
            audioUrl: slide.audioUrl,
            duration: slide.duration || 5
          })),
          config: {
            resolution: renderOptions.resolution,
            includeSubtitles: renderOptions.generateSubtitles || false
          },
          settings: {
            avatarId: renderOptions.avatarId
          },
          priority: 10
        });
        
        logger.info('✅ Job adicionado à fila BullMQ com sucesso', {
          component: 'PptxToVideoService',
          renderJobId: renderJob.id,
          bullmqJobId: jobId
        });
      } catch (queueError) {
        logger.error('❌ Falha ao adicionar job à fila BullMQ', queueError instanceof Error ? queueError : new Error(String(queueError)), {
          component: 'PptxToVideoService',
          renderJobId: renderJob.id
        });
        // Não falhar completamente - o job fica no banco para processamento manual
      }

      return renderJob;

    } catch (error) {
      logger.error('❌ Erro ao criar render job', error instanceof Error ? error : new Error(String(error)), {
        component: 'PptxToVideoService'
      });
      return null;
    }
  }

  /**
   * Gera TTS usando o provider configurado - REAL IMPLEMENTATION
   */
  private async generateTTS(text: string, options: { voiceId?: string; provider: string }) {
    const { voiceId, provider } = options;
    
    // Import REAL TTS service
    const { synthesizeToFile } = await import('@/lib/tts/tts-service');
    
    try {
      const result = await synthesizeToFile({
        text,
        voiceId: voiceId || 'pt-BR-FranciscaNeural',
        language: 'pt-BR',
        format: 'mp3'
      });
      
      return {
        audioUrl: result.fileUrl,
        duration: result.duration
      };
    } catch (error) {
      logger.error('TTS generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'PptxToVideoService',
        provider,
        text: text.substring(0, 50)
      });
      
      // Only in development, fallback to mock - NEVER in production
      if (process.env.NODE_ENV === 'development') {
        const wordCount = text.split(' ').length;
        const duration = Math.max((wordCount / 150) * 60, 1);
        
        return {
          audioUrl: 'mock-audio-url',
          duration
        };
      }
      
      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcula tempo estimado de processamento
   */
  private calculateEstimatedTime(slides: Array<{ duration?: number }>): number {
    const totalDuration = slides.reduce((acc, slide) => acc + (slide.duration || 5), 0);
    
    // Estimativa: 2x a duração do vídeo para renderização
    return Math.ceil(totalDuration * 2);
  }
}