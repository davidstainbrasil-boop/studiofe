/**
 * PPTX Real Parser
 * Parser oficial de PPTX - conectado ao PPTXProcessorReal
 */

import { logger } from '@lib/logger';
import PPTXProcessorReal from './pptx/pptx-processor-real';
import type { PPTXExtractionResult } from './pptx/pptx-processor-real';
import * as fs from 'fs/promises';

export interface ParsedSlide {
  index: number;
  title: string;
  text: string;
  notes: string;
  images: string[];
  elements?: Record<string, unknown>[];
  layout?: string;
  duration?: number;
}

export interface ParsedPresentation {
  slides: ParsedSlide[];
  totalSlides: number;
  metadata: {
    title?: string;
    author?: string;
    application?: string;
  };
  assets?: {
    images: Array<{ id: string; src: string; slideIndex: number }>;
    audio: Array<{ id: string; src: string; duration?: number }>;
    videos: Array<{ id: string; src: string; duration?: number }>;
  };
  timeline?: {
    totalDuration: number;
    scenes: Array<{ slideIndex: number; startTime: number; endTime: number }>;
  };
  compliance?: {
    score: number;
    accessibility: boolean;
    fonts: string[];
    warnings: string[];
  };
}

export class PPTXRealParser {
  /**
   * Parse PPTX from file path
   */
  async parseFile(filePath: string, projectId?: string): Promise<ParsedPresentation> {
    logger.info('Parsing PPTX file', { component: 'PPTXRealParser', filePath });
    
    try {
      const buffer = await fs.readFile(filePath);
      return this.parseBuffer(buffer, projectId || `project-${Date.now()}`);
    } catch (error) {
      logger.error('Failed to parse PPTX file', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Parse PPTX from buffer - REAL IMPLEMENTATION
   */
  async parseBuffer(buffer: Buffer, projectId?: string): Promise<ParsedPresentation> {
    logger.info('Parsing PPTX buffer', { component: 'PPTXRealParser', size: buffer.length });
    
    const pid = projectId || `project-${Date.now()}`;
    
    // Use the REAL PPTXProcessorReal.extract() method
    const result: PPTXExtractionResult = await PPTXProcessorReal.extract(buffer, pid);
    
    if (!result.success) {
      logger.error('PPTX extraction failed', result.error instanceof Error ? result.error : new Error(String(result.error)));
      throw new Error(`PPTX extraction failed: ${result.error}`);
    }

    // Convert to ParsedPresentation format
    const slides: ParsedSlide[] = result.slides.map((slide, index) => ({
      index: index,
      title: slide.title || `Slide ${slide.slideNumber}`,
      text: slide.content || '',
      notes: slide.notes || '',
      images: slide.images || [],
      layout: slide.layout,
      duration: slide.duration,
      elements: []
    }));

    // Build assets array with slide context
    const imageAssets = result.slides.flatMap((slide, idx) => 
      slide.images.map((src, imgIdx) => ({
        id: `img-${idx}-${imgIdx}`,
        src,
        slideIndex: idx
      }))
    );

    // Convert timeline scenes to ParsedPresentation format
    const scenes = result.timeline?.scenes.map(scene => ({
      slideIndex: scene.slideNumber - 1,
      startTime: scene.startTime,
      endTime: scene.endTime
    })) || [];

    return {
      slides,
      totalSlides: slides.length,
      metadata: {
        title: result.metadata?.title,
        author: result.metadata?.author,
        application: result.metadata?.application,
      },
      assets: {
        images: imageAssets,
        audio: [],
        videos: []
      },
      timeline: {
        totalDuration: result.timeline?.totalDuration || 0,
        scenes
      }
    };
  }

  /**
   * Parse from S3 key - delegates to parseBuffer after fetching
   */
  async parseFromS3(s3Key: string, projectId?: string): Promise<ParsedPresentation> {
    logger.info('Parsing from S3', { component: 'PPTXRealParser', s3Key });
    
    try {
      // Import storage system dynamically
      const { storageSystem } = await import('@/lib/storage-system-real');
      
      // Download from S3/Supabase
      const buffer = await storageSystem.download({
        bucket: 'project-assets',
        path: s3Key
      });
      
      return this.parseBuffer(buffer, projectId || `project-${Date.now()}`);
    } catch (error) {
      logger.error('Failed to parse from S3', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Quick text extraction without full processing
   */
  async extractText(buffer: Buffer): Promise<string> {
    const processor = new PPTXProcessorReal();
    return processor.extractText(buffer);
  }
}

export const pptxRealParser = new PPTXRealParser();
