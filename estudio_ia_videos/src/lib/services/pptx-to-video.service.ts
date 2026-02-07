/**
 * 🎬 Pipeline PPTX → Vídeo E2E Service
 * Orquestra o fluxo completo do diferencial do produto
 */

import { logger } from '@/lib/monitoring/logger';
import { prisma } from '@/lib/prisma';
import { PptxUploader } from '@/lib/storage/pptx-uploader';
import { PPTXProcessorReal } from '@/lib/pptx/pptx-processor-real';
import { RealTTSService } from '@/lib/tts/real-tts-service';
import { SlideToVideoComposer } from '@/lib/video/slide-to-video-composer';

export interface PptxToVideoOptions {
  userId: string;
  file: File;
  projectName: string;
  voiceId?: string;
  ttsProvider?: 'elevenlabs' | 'azure' | 'google' | 'mock';
  avatarId?: string;
  resolution?: '720p' | '1080p' | '4k';
  generateSubtitles?: boolean;
}

export interface PipelineResult {
  projectId: string;
  jobId?: string;
  slides: Array<{
    id: string;
    content: string;
    notes?: string;
    audioUrl?: string;
  }>;
  status: 'slides_extracted' | 'tts_generated' | 'render_started' | 'completed' | 'failed';
  estimatedTime?: number;
}

export class PptxToVideoService {
  private pptxUploader = new PptxUploader();
  private pptxProcessor = new PPTXProcessorReal();
  private realTSService: RealTTSService;
  private slideComposer: SlideToVideoComposer;

  constructor() {
    this.realTSService = new RealTTSService();
    this.slideComposer = new SlideToVideoComposer();
  }

  /**
   * Process PPTX and generate TTS-augmented slides
   */
  async processPptxToVideo(options: PptxToVideoOptions): Promise<PipelineResult> {
    const startTime = Date.now();
    
    try {
      logger.info('🎬 Starting PPTX → Video pipeline', {
        projectId: options.projectName,
        slidesCount: 1,
        ttsProvider: options.ttsProvider
      });

      // Phase 1: Upload and extract slides
      const uploadResult = await this.uploadAndExtractSlides(options.userId, options.file, options.projectName);
      
      if (!uploadResult.success || !uploadResult.slides) {
        throw new Error('Failed to extract slides');
      }

      // Phase 2: Generate TTS for each slide
      const videoResult = await this.slideComposer.composeSlidesToVideo(
        uploadResult.slides as any,
        options.projectName,
        options.voiceId || 'bella'
      );

      // Phase 3: Create video composition result
      const composedSlides = (videoResult as any).slides || uploadResult.slides || [];
      const result: PipelineResult = {
        projectId: (uploadResult as any).project?.id || options.projectName,
        slides: composedSlides.map((s: any) => ({
          id: s.id || '',
          content: s.content || '',
          notes: s.notes,
          audioUrl: s.audioUrl
        })),
        status: 'tts_generated',
        estimatedTime: (videoResult as any).duration || 0
      };

      logger.info('✅ PPTX → Video pipeline completed successfully', {
        projectId: result.projectId,
        slidesCount: composedSlides.length,
        totalDuration: result.estimatedTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('❌ PPTX → Video pipeline failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'PptxToVideoService',
          projectId: options.projectName,
          processingTime
        }
      );

      return {
        projectId: '',
        slides: [],
        status: 'failed' as const,
      };
    }
  }

  /**
   * Upload and extract slides helper
   */
  private async uploadAndExtractSlides(userId: string, file: File, projectName: string) {
    try {
      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Create project in database first
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

      // Process PPTX
      const extractionResult = await (this.pptxProcessor as any).extract(buffer, project.id);
      
      if (!extractionResult.success) {
        throw new Error('Failed to extract slides');
      }

      // Update project metadata
      await prisma.projects.update({
        where: { id: project.id },
        data: {
          metadata: {
            slideCount: extractionResult.slides?.length || 0,
            originalFile: file.name,
            createdVia: 'pptx_pipeline'
          }
        }
      });

      return {
        success: true,
        slides: extractionResult.slides || [],
        project
      };

    } catch (error) {
      logger.error('Upload and extract failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
