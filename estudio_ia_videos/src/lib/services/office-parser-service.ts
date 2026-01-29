/**
 * 📄 Office Parser Service
 * Enhanced document parsing using officeparser and JSZip
 * Supports PPTX, DOCX, XLSX with rich metadata extraction
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface ParsedDocument {
  text: string;
  metadata?: DocumentMetadata;
}

interface DocumentMetadata {
  author?: string;
  title?: string;
  subject?: string;
  created?: string;
  modified?: string;
  keywords?: string[];
  slideCount?: number;
  wordCount?: number;
}

interface ParsedSlide {
  index: number;
  text: string;
  notes?: string;
  images: SlideImage[];
  shapes: SlideShape[];
}

interface SlideImage {
  name: string;
  contentType: string;
  data?: Buffer;
  path: string;
}

interface SlideShape {
  type: 'text' | 'image' | 'chart' | 'table' | 'other';
  content?: string;
  position?: { x: number; y: number };
}

interface ParsedPptx {
  slides: ParsedSlide[];
  metadata: DocumentMetadata;
  images: SlideImage[];
  themes: string[];
}

// ============================================================================
// Main Parser Functions
// ============================================================================

/**
 * Parse text content from Office documents (DOCX, PPTX, XLSX, etc.)
 * Uses officeparser for reliable text extraction
 */
export async function parseOfficeDocument(
  buffer: Buffer,
  filename: string
): Promise<ParsedDocument> {
  try {
    logger.info('[OfficeParser] Parsing document', { context: { filename } });
    
    // Dynamic import to avoid issues if officeparser not installed
    const officeParser = await import('officeparser');
    
    // officeparser can return string or AST depending on version
    const result = await officeParser.parseOffice(buffer) as string | { toString(): string };
    const text = typeof result === 'string' ? result : result.toString();
    
    logger.debug('[OfficeParser] Document parsed successfully', { 
      context: { filename, textLength: text.length }
    });
    
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
      }
    };
  } catch (error) {
    logger.error('[OfficeParser] Failed to parse document', 
      error instanceof Error ? error : new Error(String(error)), 
      { filename }
    );
    throw error;
  }
}

/**
 * Parse PPTX with full slide structure extraction using JSZip
 */
export async function parsePptxFull(buffer: Buffer): Promise<ParsedPptx> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    
    const slides: ParsedSlide[] = [];
    const images: SlideImage[] = [];
    const themes: string[] = [];
    
    // Extract slide content
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      const slideXml = await zip.file(slideFile)?.async('string');
      
      if (slideXml) {
        // Extract text from XML
        const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
        const slideText = textMatches
          .map(m => m.replace(/<\/?a:t>/g, ''))
          .filter(t => t.trim())
          .join(' ');
        
        // Try to get notes
        const notesFile = slideFile.replace('/slides/', '/notesSlides/').replace('slide', 'notesSlide');
        let notes: string | undefined;
        
        const notesXml = await zip.file(notesFile)?.async('string');
        if (notesXml) {
          const notesMatches = notesXml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
          notes = notesMatches
            .map(m => m.replace(/<\/?a:t>/g, ''))
            .filter(t => t.trim())
            .join(' ');
        }
        
        slides.push({
          index: i,
          text: slideText,
          notes,
          images: [],
          shapes: []
        });
      }
    }
    
    // Extract images
    const imageFiles = Object.keys(zip.files)
      .filter(name => name.match(/ppt\/media\/(image|picture)\d+\.(png|jpg|jpeg|gif|svg)$/i));
    
    for (const imagePath of imageFiles) {
      const imageData = await zip.file(imagePath)?.async('nodebuffer');
      const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
      const contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      
      images.push({
        name: imagePath.split('/').pop() || 'image',
        contentType,
        data: imageData,
        path: imagePath
      });
    }
    
    // Extract metadata from docProps/core.xml
    let metadata: DocumentMetadata = { slideCount: slides.length };
    const coreXml = await zip.file('docProps/core.xml')?.async('string');
    
    if (coreXml) {
      const titleMatch = coreXml.match(/<dc:title>([^<]*)<\/dc:title>/);
      const authorMatch = coreXml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
      const subjectMatch = coreXml.match(/<dc:subject>([^<]*)<\/dc:subject>/);
      const createdMatch = coreXml.match(/<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/);
      const modifiedMatch = coreXml.match(/<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/);
      
      metadata = {
        ...metadata,
        title: titleMatch?.[1],
        author: authorMatch?.[1],
        subject: subjectMatch?.[1],
        created: createdMatch?.[1],
        modified: modifiedMatch?.[1],
      };
    }
    
    logger.info('[OfficeParser] PPTX parsed successfully', {
      context: {
        slideCount: slides.length,
        imageCount: images.length,
      }
    });
    
    return { slides, metadata, images, themes };
    
  } catch (error) {
    logger.error('[OfficeParser] Failed to parse PPTX', 
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Extract text from PPTX for narration/script generation
 * Uses full parser for better slide separation
 */
export async function extractPptxText(buffer: Buffer): Promise<string[]> {
  try {
    // Try full parsing first for better structure
    try {
      const parsed = await parsePptxFull(buffer);
      return parsed.slides.map(s => s.text).filter(t => t.trim().length > 0);
    } catch {
      // Fallback to simple parsing
      const { text } = await parseOfficeDocument(buffer, 'presentation.pptx');
      
      const slides = text
        .split(/\n{2,}/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      return slides;
    }
  } catch (error) {
    logger.error('[OfficeParser] Failed to extract PPTX text', 
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * Extract slides with notes for script generation
 */
export async function extractPptxWithNotes(buffer: Buffer): Promise<Array<{ text: string; notes?: string }>> {
  try {
    const parsed = await parsePptxFull(buffer);
    return parsed.slides.map(s => ({
      text: s.text,
      notes: s.notes
    }));
  } catch (error) {
    logger.error('[OfficeParser] Failed to extract PPTX with notes', 
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * Extract images from PPTX
 */
export async function extractPptxImages(buffer: Buffer): Promise<SlideImage[]> {
  try {
    const parsed = await parsePptxFull(buffer);
    return parsed.images;
  } catch (error) {
    logger.error('[OfficeParser] Failed to extract PPTX images', 
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * Extract text from DOCX for script import
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const { text } = await parseOfficeDocument(buffer, 'document.docx');
  return text;
}

/**
 * Check if file is supported Office format
 */
export function isSupportedFormat(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ['docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods', 'pdf'].includes(ext || '');
}

/**
 * Get file format category
 */
export function getFormatCategory(filename: string): 'presentation' | 'document' | 'spreadsheet' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (['pptx', 'ppt', 'odp', 'key'].includes(ext || '')) return 'presentation';
  if (['docx', 'doc', 'odt', 'rtf', 'pdf'].includes(ext || '')) return 'document';
  if (['xlsx', 'xls', 'ods', 'csv'].includes(ext || '')) return 'spreadsheet';
  
  return 'unknown';
}

/**
 * Estimate narration duration from text
 * Based on average speaking rate of 150 words per minute
 */
export function estimateNarrationDuration(text: string, wordsPerMinute = 150): number {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil((wordCount / wordsPerMinute) * 60); // Return seconds
}

/**
 * Generate script from PPTX slides
 * Combines slide text with notes for narration
 */
export async function generateScriptFromPptx(buffer: Buffer): Promise<string> {
  try {
    const slidesWithNotes = await extractPptxWithNotes(buffer);
    
    const scriptParts = slidesWithNotes.map((slide, index) => {
      const slideHeader = `--- Slide ${index + 1} ---`;
      const content = slide.notes || slide.text;
      return `${slideHeader}\n${content}`;
    });
    
    return scriptParts.join('\n\n');
  } catch (error) {
    logger.error('[OfficeParser] Failed to generate script', 
      error instanceof Error ? error : new Error(String(error))
    );
    return '';
  }
}

// Export types for use elsewhere
export type { ParsedDocument, ParsedSlide, ParsedPptx, SlideImage, DocumentMetadata };
