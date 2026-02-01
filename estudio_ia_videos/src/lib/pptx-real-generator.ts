/**
 * PPTX Real Generator
 * Gerador de arquivos PPTX a partir de dados reais usando pptxgenjs
 */

import PptxGenJS from 'pptxgenjs';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { randomUUID } from 'crypto';
import { storageSystem } from '@lib/storage-system-real';

export interface GeneratorSlide {
  title: string;
  content: string;
  layout?: 'title' | 'content' | 'blank';
  notes?: string;
  backgroundImage?: string;
  backgroundColor?: string;
}

export interface GeneratorOptions {
  theme?: string;
  aspectRatio?: '16:9' | '4:3';
  author?: string;
}

export interface PptxGenerationOptions extends GeneratorOptions {
  template?: string;
  title?: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface PptxGenerationResult {
  success: boolean;
  pptxUrl?: string; // URL relative to storage or api
  filename?: string;
  buffer?: Buffer;
  slideCount?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export class PPTXRealGenerator {
  async generate(slides: GeneratorSlide[], options?: GeneratorOptions): Promise<Buffer> {
    logger.info('Generating presentation (Real)', { component: 'PPTXRealGenerator', slideCount: slides.length });
    
    // 1. Init
    const pres = new PptxGenJS();
    
    // 2. Metadata
    pres.author = options?.author || 'Estúdio IA Vídeos';
    pres.company = 'Estúdio IA Vídeos';
    pres.title = 'Generated Presentation';
    
    // 3. Layout
    if (options?.aspectRatio === '4:3') {
      pres.layout = 'LAYOUT_4x3';
    } else {
      pres.layout = 'LAYOUT_16x9';
    }

    // 4. Add Slides
    for (const slideData of slides) {
      const slide = pres.addSlide();
      
      // Background
      if (slideData.backgroundColor) {
        slide.background = { color: slideData.backgroundColor.replace('#', '') };
      }
      // Note: backgroundImage support requires valid path/url. Assuming handle by pptxgenjs or pre-processed.

      // Title
      if (slideData.title) {
        slide.addText(slideData.title, { 
          x: 0.5, y: 0.5, w: '90%', h: 1, 
          fontSize: 24, bold: true, color: '363636', align: 'center'
        });
      }
      
      // Content
      if (slideData.content) {
        slide.addText(slideData.content, { 
          x: 0.5, y: 1.5, w: '90%', h: 4, 
          fontSize: 18, color: '666666', align: 'left', valign: 'top'
        });
      }
      
      // Notes
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    }

    // 5. Generate Buffer
    return (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
  }
}

export const pptxRealGenerator = new PPTXRealGenerator();

/**
 * Generates a real PPTX file from a project's database record.
 */
export const generateRealPptxFromProject = async (
  projectId: string, 
  options?: PptxGenerationOptions
): Promise<PptxGenerationResult> => {
  logger.info('[PPTXGenerator] Fetching project data for PPTX generation:', { component: 'PPTXRealGenerator', projectId });
  
  try {
    // 1. Fetch Project Data from Prisma
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        slides: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // 2. Map Slides from database
    const generatorSlides: GeneratorSlide[] = [];
    
    if (project.slides && project.slides.length > 0) {
      for (const dbSlide of project.slides) {
         // Content is a plain text string in our schema
         const content = dbSlide.content || '';
         generatorSlides.push({
           title: dbSlide.title || '',
           content: content,
           notes: '', // notes field doesn't exist in schema, use empty
           backgroundColor: dbSlide.backgroundColor || undefined,
         });
      }
    }

    // If no slides, try to extract from project metadata
    if (generatorSlides.length === 0 && project.metadata) {
       const meta = project.metadata as Record<string, unknown>;
       const slidesData = meta['slidesData'] as unknown[];
       if (Array.isArray(slidesData)) {
         slidesData.forEach((s: unknown) => {
           const slide = s as Record<string, unknown>;
           generatorSlides.push({
             title: String(slide.title || ''),
             content: String(slide.content || slide.text || ''),
             notes: String(slide.notes || '')
           });
         });
       }
    }

    if (generatorSlides.length === 0) {
      logger.warn('Project has no slides to generate', { projectId });
    }

    // 3. Generate PPTX
    const buffer = await pptxRealGenerator.generate(generatorSlides, {
      author: 'Estúdio IA',
      ...options
    });

    const filename = `presentation_${projectId}_${Date.now()}_${randomUUID()}.pptx`;
    const storagePath = `pptx/generated/${projectId}/${filename}`;
    const pptxUrl = await storageSystem.upload({
      bucket: 'uploads',
      path: storagePath,
      file: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });

    // Update project metadata with pptx info (pptxUrl field doesn't exist in schema)
    const currentMetadata = (project.metadata as Record<string, unknown>) || {};
    await prisma.projects.update({
      where: { id: projectId },
      data: {
        metadata: {
          ...currentMetadata,
          pptxUrl,
          pptxGenerated: true,
          generatedAt: new Date().toISOString(),
          slideCount: generatorSlides.length,
          pptxStoragePath: storagePath
        }
      }
    });

    return {
      success: true,
      pptxUrl,
      filename,
      buffer,
      slideCount: generatorSlides.length,
      metadata: { generatedAt: new Date().toISOString(), storagePath }
    };

  } catch (error) {
    logger.error('Failed to generate real PPTX', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
