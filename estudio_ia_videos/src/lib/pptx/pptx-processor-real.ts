/**
 * PPTX Processor Real
 * Processador real de arquivos PPTX (orquestrador)
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { PPTXCoreParser } from './pptx-core-parser';
import { PPTXParserAdvanced } from '../pptx-parser-advanced';
import { logger } from '@lib/logger';

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

// Helper interfaces for XML parsing
interface PPTXTextRun {
  'a:t'?: string;
}
interface PPTXParagraph {
  'a:r'?: PPTXTextRun | PPTXTextRun[];
}
interface PPTXTxBody {
  'a:p'?: PPTXParagraph | PPTXParagraph[];
}
interface PPTXShape {
  'p:txBody'?: PPTXTxBody;
}


import { basename } from 'path';

export class PPTXProcessorReal {
  private coreParser = new PPTXCoreParser();
  private advancedParser = new PPTXParserAdvanced();
  
  async process(buffer: Buffer): Promise<ProcessedSlide[]> {
    logger.info('[PPTX Processor] Processing presentation', { component: 'PPTXProcessorReal' });
    const structure = await this.coreParser.parseStructure(buffer);
    const parsed = await this.advancedParser.parse(buffer);
    return parsed.slides.map(slide => ({
      index: slide.index,
      title: slide.title,
      content: Array.isArray(slide.content) ? slide.content.join('\n') : String(slide.content || ''),
      images: [],
      notes: slide.notes,
    }));
  }
  
  async extractText(buffer: Buffer): Promise<string> {
    const slides = await this.process(buffer);
    return slides.map(s => s.content).join('\n\n');
  }

  static async extract(buffer: Buffer, projectId: string): Promise<PPTXExtractionResult> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

      // Metadata
      const metadata: PPTXMetadata = {
        title: 'Sem título',
        author: 'Desconhecido',
        totalSlides: 0,
        application: 'Unknown',
        dimensions: { width: 1920, height: 1080 }
      };

      const coerceText = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number') return String(value);
        if (!value || typeof value !== 'object') return undefined;
        const maybeText = (value as { '#text'?: unknown })['#text'];
        if (typeof maybeText === 'string') return maybeText.trim();
        return undefined;
      };

      // Metadata: core.xml
      const coreFile = zip.file('docProps/core.xml');
      if (coreFile) {
        const coreXml = await coreFile.async('string');
        const coreObj = parser.parse(coreXml);
        const coreProps = coreObj['cp:coreProperties'] ?? coreObj['coreProperties'];
        const title = coerceText(coreProps?.['dc:title']);
        const author = coerceText(coreProps?.['dc:creator']);
        if (title) metadata.title = title;
        if (author) metadata.author = author;
      }

      // Metadata: app.xml
      const appFile = zip.file('docProps/app.xml');
      if (appFile) {
        const appXml = await appFile.async('string');
        const appObj = parser.parse(appXml);
        const props = appObj['Properties'] ?? appObj['ep:Properties'] ?? appObj['Properties'];
        const application = coerceText(props?.['Application']);
        const slidesCount = coerceText(props?.['Slides']);
        if (application) metadata.application = application;
        if (slidesCount) {
          const parsed = Number.parseInt(slidesCount, 10);
          if (Number.isFinite(parsed)) metadata.totalSlides = parsed;
        }
      }

      // Slides Processing with Rel Mapping
      const slides: PPTXSlide[] = [];
      const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/));
      
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
        const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
        return numA - numB;
      });

      // Prepare output directory for images (REMOVED LOCAL FS)
      // We will upload directly to Supabase Storage: bucket 'project-assets'
      const { storageSystem } = await import('@/lib/storage-system-real');

      for (let i = 0; i < slideFiles.length; i++) {
        const filename = slideFiles[i];
        const slideNum = i + 1;
        const slideXml = await zip.file(filename)!.async('string');
        const slideObj = parser.parse(slideXml);
        
        let title = '';
        let content = '';
        let notes = '';
        const slideImages: string[] = [];

        // 1. Map Relationships (Images)
        const relsFilename = filename.replace('ppt/slides/', 'ppt/slides/_rels/').replace('.xml', '.xml.rels');
        const relsFile = zip.file(relsFilename);
        const relMap: Record<string, string> = {};

        if (relsFile) {
            const relsXml = await relsFile.async('string');
            const relsObj = parser.parse(relsXml);
            const relationships = relsObj['Relationships']?.['Relationship'];
            if (relationships) {
                const relList = Array.isArray(relationships) ? relationships : [relationships];
              relList.forEach((rel: any) => {
                relMap[rel['@_Id']] = rel['@_Target'];
                });
            }
        }

          // 2. Extract Images referenced by Relationships
          const uniqueTargets = Array.from(new Set(Object.values(relMap)));
          for (const target of uniqueTargets) {
            if (!target) continue;
            const lower = target.toLowerCase();
            if (!lower.includes('.png') && !lower.includes('.jpg') && !lower.includes('.jpeg')) continue;

            const mediaPath = target.replace('../', 'ppt/');
            const mediaFile = zip.file(mediaPath);
            if (!mediaFile) continue;

            const imgBuffer = await mediaFile.async('nodebuffer');
            const ext = lower.split('.').pop() || 'jpg';
            const imgName = `slide-${slideNum}-${basename(mediaPath)}`;
            const storagePath = `projects/${projectId}/images/${imgName}`;
            
            try {
                // Upload to Supabase Storage
                // Using 'project-assets' bucket. 
                // Ensure contentType is correct.
                const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
                
                const publicUrl = await storageSystem.upload({
                    bucket: 'project-assets',
                    path: storagePath,
                    file: imgBuffer,
                    contentType
                });
                
                slideImages.push(publicUrl);
                logger.info('Uploaded PPTX image', { projectId, slideNum, publicUrl });
            } catch (uploadError) {
                logger.error('Failed to upload slide image', uploadError as Error, { projectId, imgName });
                // Continue without this image?
            }
          }

        // 3. Extract Text
        const textParts: string[] = [];
        const spTree = slideObj['p:sld']?.['p:cSld']?.['p:spTree'];
        const shapes = spTree?.['p:sp'];
        
        if (shapes) {
            const shapeList = (Array.isArray(shapes) ? shapes : [shapes]) as PPTXShape[];
            shapeList.forEach((sp) => {
                const txBody = sp['p:txBody'];
                if (txBody) {
                    const paras = (Array.isArray(txBody['a:p']) ? txBody['a:p'] : [txBody['a:p']]) as PPTXParagraph[];
                    paras.forEach((p) => {
                        if (p && p['a:r']) {
                            const runs = (Array.isArray(p['a:r']) ? p['a:r'] : [p['a:r']]) as PPTXTextRun[];
                            runs.forEach((r) => {
                                if (r && r['a:t']) {
                                    textParts.push(r['a:t']);
                                }
                            });
                        }
                    });
                }
            });
        }
        
        if (textParts.length > 0) {
            title = textParts[0];
            content = textParts.join(' ');
        }

        const hasTitlePlaceholder = /<p:ph[^>]*type="title"\s*\/?\s*>/.test(slideXml);
        const hasBodyPlaceholder = /<p:ph[^>]*type="body"\s*\/?\s*>/.test(slideXml);
        const hasPic = slideXml.includes('<p:pic');
        const hasText = textParts.length > 0;

        let layout: string = 'default';
        if (hasPic && !hasText) layout = 'image-only';
        else if (hasTitlePlaceholder && hasBodyPlaceholder) layout = 'title-content';
        else if (hasTitlePlaceholder) layout = 'title';
        else if (slideImages.length > 0 && hasText) layout = 'title-image';
        else if (hasText) layout = 'content-only';
        else layout = 'blank';

        // 4. Notes
        const notesFile = zip.file(`ppt/notesSlides/notesSlide${slideNum}.xml`);
        if (notesFile) {
            const notesXml = await notesFile.async('string');
            const notesObj = parser.parse(notesXml);
             const nSpTree = notesObj['p:notes']?.['p:cSld']?.['p:spTree'];
             const nShapes = nSpTree?.['p:sp'];
             if (nShapes) {
                 const nShapeList = (Array.isArray(nShapes) ? nShapes : [nShapes]) as PPTXShape[];
                 nShapeList.forEach((sp) => {
                     const txBody = sp['p:txBody'];
                     if (txBody) {
                         const paras = (Array.isArray(txBody['a:p']) ? txBody['a:p'] : [txBody['a:p']]) as PPTXParagraph[];
                         paras.forEach((p) => {
                             if (p && p['a:r']) {
                                 const runs = (Array.isArray(p['a:r']) ? p['a:r'] : [p['a:r']]) as PPTXTextRun[];
                                 runs.forEach((r) => {
                                     if (r && r['a:t']) {
                                         notes += r['a:t'] + ' ';
                                     }
                                 });
                             }
                         });
                     }
                 });
             }
        }

        slides.push({
            slideNumber: slideNum,
            title: title || `Slide ${slideNum}`,
            content: content,
            notes: notes.trim(),
            layout,
            images: slideImages, 
            animations: [], 
            duration: Math.max(5, Math.ceil(content.split(' ').length / 3)), // Rough estimate (3 words/sec)
            shapes: textParts.length, 
            textBlocks: textParts.length
        });
      }

      if (metadata.totalSlides <= 0) {
        metadata.totalSlides = slides.length;
      }

      const allImages = Array.from(new Set(slides.flatMap(s => s.images)));
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
        assets: { images: allImages, videos: [], audio: [] },
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
      // Or try to return the first extracted image if we had access to the extraction result here.
      // Since this method is static and separate, we can't easily access the extraction result.
      // We will stick to null or a default for now, and let the UI handle it.
      return null; 
  }
}

export const pptxProcessor = new PPTXProcessorReal();
export default PPTXProcessorReal;
