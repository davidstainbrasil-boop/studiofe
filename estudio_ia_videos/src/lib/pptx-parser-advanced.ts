/**
 * PPTX Parser Advanced
 * Parser avançado de arquivos PowerPoint
 */

import { logger } from '@lib/logger';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { basename } from 'path';

export interface ParsedSlide {
  index: number;
  slideNumber: number;
  title?: string;
  content: string | string[];
  images: string[]; // References to image IDs or filenames
  notes?: string;
  layout?: string;
  shapes: number;
  textBlocks: number;
  duration: number;
}

export interface ParsedImage {
  id: string; // Internal ID (e.g. rId or path)
  name: string; // Filename
  data: Buffer;
  extension: string;
}

export interface ParsedPPTX {
  slides: ParsedSlide[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    createdAt?: Date;
    created?: Date;
    modified?: Date;
    slideCount?: number;
    application?: string;
    totalSlides?: number;
  };
  images: ParsedImage[];
}

// Helper interfaces for XML parsing
interface PPTXTextRun {
  'a:t'?: string | { '#text': string };
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

export class PPTXParserAdvanced {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  async parse(buffer: Buffer): Promise<ParsedPPTX> {
    logger.info('[PPTX Parser] Parsing presentation', { component: 'PPTXParserAdvanced' });
    
    try {
      const zip = await JSZip.loadAsync(buffer);
      
      // 1. Parse Metadata
      const metadata = await this.parseMetadata(zip);
      
      // 2. Parse Slides
      const { slides, images } = await this.parseSlides(zip);

      if (metadata.totalSlides === undefined || metadata.totalSlides === 0) {
        metadata.totalSlides = slides.length;
        metadata.slideCount = slides.length;
      }

      return {
        slides,
        metadata,
        images
      };
    } catch (error) {
      logger.error('Failed to parse PPTX', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async parseMetadata(zip: JSZip): Promise<ParsedPPTX['metadata']> {
    const metadata: ParsedPPTX['metadata'] = {
        title: 'Sem título',
        author: 'Desconhecido',
        totalSlides: 0,
        application: 'Unknown'
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
        const coreObj = this.parser.parse(coreXml);
        const coreProps = coreObj['cp:coreProperties'] ?? coreObj['coreProperties'];
        const title = coerceText(coreProps?.['dc:title']);
        const author = coerceText(coreProps?.['dc:creator']);
        const created = coerceText(coreProps?.['dcterms:created']);
        const modified = coerceText(coreProps?.['dcterms:modified']);

        if (title) metadata.title = title;
        if (author) metadata.author = author;
        if (created) metadata.created = new Date(created);
        if (modified) metadata.modified = new Date(modified);
    }

    // Metadata: app.xml
    const appFile = zip.file('docProps/app.xml');
    if (appFile) {
        const appXml = await appFile.async('string');
        const appObj = this.parser.parse(appXml);
        const props = appObj['Properties'] ?? appObj['ep:Properties'] ?? appObj['Properties'];
        const application = coerceText(props?.['Application']);
        const slidesCount = coerceText(props?.['Slides']);
        
        if (application) metadata.application = application;
        if (slidesCount) {
            const parsed = Number.parseInt(slidesCount, 10);
            if (Number.isFinite(parsed)) metadata.totalSlides = parsed;
        }
    }

    return metadata;
  }

  private async parseSlides(zip: JSZip): Promise<{ slides: ParsedSlide[], images: ParsedImage[] }> {
    const slides: ParsedSlide[] = [];
    const allImages: ParsedImage[] = [];
    const imageMap = new Map<string, ParsedImage>(); // Avoid duplicates

    // Find all slide files
    const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/));
      
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
        const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
        return numA - numB;
    });

    for (let i = 0; i < slideFiles.length; i++) {
        const filename = slideFiles[i];
        const slideNum = i + 1;
        const slideXml = await zip.file(filename)!.async('string');
        const slideObj = this.parser.parse(slideXml);
        
        let title = '';
        let content = '';
        let notes = '';
        const slideImageRefs: string[] = [];

        // 1. Map Relationships (Images)
        const relsFilename = filename.replace('ppt/slides/', 'ppt/slides/_rels/').replace('.xml', '.xml.rels');
        const relsFile = zip.file(relsFilename);
        const relMap: Record<string, string> = {};

        if (relsFile) {
            const relsXml = await relsFile.async('string');
            const relsObj = this.parser.parse(relsXml);
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
            const imgName = basename(mediaPath);
            const imgId = `${slideNum}-${imgName}`; // Unique ID for this slide context, or use mediaPath for global uniqueness

            // Use mediaPath as global key to avoid duplicating same image used in multiple slides
            if (!imageMap.has(mediaPath)) {
                imageMap.set(mediaPath, {
                    id: mediaPath,
                    name: imgName,
                    data: imgBuffer,
                    extension: ext
                });
            }

            slideImageRefs.push(mediaPath);
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
                                    // a:t can be string or object
                                    const val = r['a:t'];
                                    const txt = typeof val === 'object' ? val['#text'] : val;
                                    if (txt) textParts.push(txt);
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

        // 4. Determine Layout
        const hasTitlePlaceholder = /<p:ph[^>]*type="title"\s*\/?\s*>/.test(slideXml);
        const hasBodyPlaceholder = /<p:ph[^>]*type="body"\s*\/?\s*>/.test(slideXml);
        const hasPic = slideXml.includes('<p:pic');
        const hasText = textParts.length > 0;

        let layout: string = 'default';
        if (hasPic && !hasText) layout = 'image-only';
        else if (hasTitlePlaceholder && hasBodyPlaceholder) layout = 'title-content';
        else if (hasTitlePlaceholder) layout = 'title';
        else if (slideImageRefs.length > 0 && hasText) layout = 'title-image';
        else if (hasText) layout = 'content-only';
        else layout = 'blank';

        // 5. Notes
        const notesFile = zip.file(`ppt/notesSlides/notesSlide${slideNum}.xml`);
        if (notesFile) {
            const notesXml = await notesFile.async('string');
            const notesObj = this.parser.parse(notesXml);
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
                                         const val = r['a:t'];
                                         const txt = typeof val === 'object' ? val['#text'] : val;
                                         if (txt) notes += txt + ' ';
                                     }
                                 });
                             }
                         });
                     }
                 });
             }
        }

        slides.push({
            index: i,
            slideNumber: slideNum,
            title: title || `Slide ${slideNum}`,
            content: content,
            notes: notes.trim(),
            layout,
            images: slideImageRefs,
            shapes: textParts.length,
            textBlocks: textParts.length,
            duration: Math.max(5, Math.ceil(content.split(' ').length / 3))
        });
    }

    return {
        slides,
        images: Array.from(imageMap.values())
    };
  }

  async extractImages(buffer: Buffer): Promise<Buffer[]> {
     const parsed = await this.parse(buffer);
     return parsed.images.map(img => img.data);
  }
}

export const pptxParserAdvanced = new PPTXParserAdvanced();

export async function parsePPTXAdvanced(buffer: Buffer): Promise<ParsedPPTX> {
  return pptxParserAdvanced.parse(buffer);
}
