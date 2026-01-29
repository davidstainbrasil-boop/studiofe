
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '@/lib/monitoring/logger';

interface Relationship {
  Id: string;
  Type: string;
  Target: string;
}

export interface ExtractedImage {
  dataUrl: string;
  mimeType: string;
  extension: string;
  filename?: string;
}

export interface ImageExtractionOptions {
  includeDataUrl?: boolean;
}

export class PPTXImageParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '', // Clean attributes for simpler access
      parseAttributeValue: true,
    });
  }

  /**
   * Extracts images associated with a specific slide
   * @param zip The JSZip instance of the PPTX file
   * @param slideNumber The 1-based index of the slide
   */
  public async extractImages(
    zip: JSZip,
    slideNumber: number,
    options: ImageExtractionOptions = {},
  ): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];
    
    try {
      // 1. Read relationships file for the slide
      const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const relsFile = zip.file(relsPath);
      
      if (!relsFile) {
        return images;
      }

      const relsXml = await relsFile.async('string');
      const relsDoc = this.xmlParser.parse(relsXml);
      
      // Handle single or multiple relationships
      const relationships = this.toArray(relsDoc.Relationships?.Relationship);
      
      // 2. Filter for image relationships
      // Common image types: http://schemas.openxmlformats.org/officeDocument/2006/relationships/image
      const imageRels = relationships.filter((rel: any) => 
        rel.Type && rel.Type.endsWith('/image')
      );

      // 3. Extract each image
      for (const rel of imageRels) {
        let target = rel.Target as string;
        
        // Target is usually relative like "../media/image1.png"
        // We need to resolve it to "ppt/media/image1.png"
        if (target.startsWith('../')) {
          target = target.replace('../', 'ppt/');
        } else if (!target.startsWith('ppt/')) {
          target = `ppt/slides/${target}`; // Relative to slide folder if no ../
        }

        const imageFile = zip.file(target);
        if (imageFile) {
          const buffer = await imageFile.async('nodebuffer');
          const base64 = buffer.toString('base64');
          const extension = target.split('.').pop() || 'png';
          const mimeType = this.getMimeType(extension);
          
          const dataUrl = `data:${mimeType};base64,${base64}`;
          if (options.includeDataUrl ?? true) {
            images.push({
              dataUrl,
              mimeType,
              extension,
              filename: target.split('/').pop()
            });
          }
        }
      }
    } catch (error) {
      logger.error(
        `Failed to extract images for slide ${slideNumber}`,
        error instanceof Error ? error : new Error(String(error)),
        { slideNumber }
      );
    }

    return images;
  }

  private toArray(value: any): any[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private getMimeType(extension: string): string {
    const map: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
    };
    return map[extension.toLowerCase()] || 'image/png';
  }
}
