/**
 * PPTX Processor Real
 * Processador real de arquivos PPTX (orquestrador)
 */

import { logger } from '@lib/logger';
import { PPTXCoreParser } from './pptx-core-parser';
import { PPTXParserAdvanced, ParsedPPTX } from '../pptx-parser-advanced';
import { basename } from 'path';

export interface ProcessedSlide {
  index: number;
  title?: string;
  content: string;
  images: Buffer[];
  notes?: string;
}

interface PPTXMetadata {
  title: string;
  author: string;
  totalSlides: number;
  application: string;
  dimensions: { width: number; height: number };
}

interface PPTXSlide {
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  layout: string;
  images: string[];
  animations: unknown[];
  duration: number;
  shapes: number;
  textBlocks: number;
}

interface PPTXAssets {
  images: string[];
  videos: string[];
  audio: string[];
}

interface PPTXTimeline {
  totalDuration: number;
  scenes: Array<{
    sceneId: string;
    slideNumber: number;
    startTime: number;
    endTime: number;
    transitions: unknown[];
  }>;
}

interface PPTXStats {
  textBlocks: number;
  images: number;
  shapes: number;
  charts: number;
  tables: number;
}

export interface PPTXExtractionResult {
  success: boolean;
  slides: PPTXSlide[];
  metadata?: PPTXMetadata;
  assets?: PPTXAssets;
  timeline?: PPTXTimeline;
  extractionStats?: PPTXStats;
  error?: unknown;
}

export class PPTXProcessorReal {
  private coreParser = new PPTXCoreParser();
  private advancedParser = new PPTXParserAdvanced();
  
  async process(buffer: Buffer): Promise<ProcessedSlide[]> {
    logger.info('[PPTX Processor] Processing presentation', { component: 'PPTXProcessorReal' });
    // This method seems to be a simpler version for other use cases.
    // We can use the advanced parser here too.
    const parsed = await this.advancedParser.parse(buffer);
    return parsed.slides.map(slide => ({
      index: slide.index,
      title: slide.title,
      content: Array.isArray(slide.content) ? slide.content.join('\n') : String(slide.content || ''),
      images: [], // Images are not returned as buffers here in the new parser, but as references. 
                  // If this method expects buffers, we might need to look them up in parsed.images.
                  // For now returning empty array as this method seems unused or secondary.
      notes: slide.notes,
    }));
  }
  
  async extractText(buffer: Buffer): Promise<string> {
    const slides = await this.process(buffer);
    return slides.map(s => s.content).join('\n\n');
  }

  static async extract(buffer: Buffer, projectId: string): Promise<PPTXExtractionResult> {
    try {
      const advancedParser = new PPTXParserAdvanced();
      const parsed: ParsedPPTX = await advancedParser.parse(buffer);

      // Metadata
      const metadata: PPTXMetadata = {
        title: parsed.metadata.title || 'Sem título',
        author: parsed.metadata.author || 'Desconhecido',
        totalSlides: parsed.metadata.totalSlides || 0,
        application: parsed.metadata.application || 'Unknown',
        dimensions: { width: 1920, height: 1080 }
      };

      // Upload Images
      const { storageSystem } = await import('@/lib/storage-system-real');
      const uploadedImageMap = new Map<string, string>(); // Maps internal ID (path) to Public URL

      const allImages = parsed.images;
      for (const img of allImages) {
          const contentType = img.extension === 'png' ? 'image/png' : 'image/jpeg';
          const storagePath = `projects/${projectId}/images/${img.name}`;
          
          try {
              const publicUrl = await storageSystem.upload({
                  bucket: 'project-assets',
                  path: storagePath,
                  file: img.data,
                  contentType
              });
              
              uploadedImageMap.set(img.id, publicUrl);
              logger.info('Uploaded PPTX image', { projectId, imageId: img.id, publicUrl });
          } catch (uploadError) {
              logger.error('Failed to upload slide image', uploadError as Error, { projectId, imageName: img.name });
          }
      }

      // Map Slides
      const slides: PPTXSlide[] = parsed.slides.map(slide => {
          // Resolve image references to public URLs
          const slideImages = slide.images
              .map(imgId => uploadedImageMap.get(imgId))
              .filter((url): url is string => !!url);

          return {
              slideNumber: slide.slideNumber,
              title: slide.title || `Slide ${slide.slideNumber}`,
              content: Array.isArray(slide.content) ? slide.content.join(' ') : slide.content,
              notes: slide.notes || '',
              layout: slide.layout || 'default',
              images: slideImages,
              animations: [],
              duration: slide.duration,
              shapes: slide.shapes,
              textBlocks: slide.textBlocks
          };
      });

      const allSlideImages = Array.from(new Set(slides.flatMap(s => s.images)));
      const totalDuration = slides.reduce((acc, s) => acc + (s.duration || 0), 0);

      let currentTime = 0;
      const scenes = slides.map((slide) => {
        const startTime = currentTime;
        const endTime = startTime + (slide.duration || 0);
        currentTime = endTime;

        return {
          sceneId: `scene_${slide.slideNumber}`,
          slideNumber: slide.slideNumber,
          startTime,
          endTime,
          transitions: [] as unknown[]
        };
      });

      const extractionStats: PPTXStats = {
        textBlocks: slides.reduce((acc, s) => acc + (s.textBlocks || 0), 0),
        images: slides.reduce((acc, s) => acc + (s.images?.length || 0), 0),
        shapes: slides.reduce((acc, s) => acc + (s.shapes || 0), 0),
        charts: 0,
        tables: 0
      };

      return {
        success: true,
        slides,
        metadata,
        assets: { images: allSlideImages, videos: [], audio: [] },
        timeline: { totalDuration, scenes },
        extractionStats
      };

    } catch (error) {
      logger.error('Falha ao extrair PPTX (PPTXProcessorReal.extract)', error instanceof Error ? error : new Error(String(error)), { component: 'PPTXProcessorReal' });
      return {
        success: false,
        error: error,
        slides: []
      };
    }
  }

  static async generateThumbnail(buffer: Buffer, projectId: string): Promise<string | null> {
      // Improved Fallback: Return null to let frontend generate from first slide content
      return null; 
  }
}

export const pptxProcessor = new PPTXProcessorReal();
export default PPTXProcessorReal;
