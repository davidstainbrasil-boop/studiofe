
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '@/lib/monitoring/logger';
import { 
  PPTXRelationship, 
  PPTXRelationshipsDoc, 
  PPTXNotesDoc,
  PPTXShape,
  PPTXParagraph,
  PPTXTextRun,
  toTypedArray 
} from '../types/pptx-xml.types';

export class PPTXNotesParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
      trimValues: true,
    });
  }

  /**
   * Extracts notes for a specific slide
   * @param zip The JSZip instance
   * @param slideNumber The 1-based slide index
   */
  public async extractNotes(zip: JSZip, slideNumber: number): Promise<string> {
    try {
      // 1. Find the relationship to the notes slide
      // ppt/slides/_rels/slideX.xml.rels -> points to ../notesSlides/notesSlideY.xml
      const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const relsFile = zip.file(relsPath);

      if (!relsFile) return '';

      const relsXml = await relsFile.async('string');
      const relsDoc = this.xmlParser.parse(relsXml) as PPTXRelationshipsDoc;
      const relationships = toTypedArray(relsDoc.Relationships?.Relationship);

      const notesRel = relationships.find((rel: PPTXRelationship) => 
        rel.Type && rel.Type.endsWith('/notesSlide')
      );

      if (!notesRel || !notesRel.Target) return '';

      // Resolve target path
      let target = notesRel.Target;
      if (target.startsWith('../')) {
        target = target.replace('../', 'ppt/');
      }

      // 2. Read the notes slide file
      const notesFile = zip.file(target);
      if (!notesFile) return '';

      const notesXml = await notesFile.async('string');
      const notesDoc = this.xmlParser.parse(notesXml) as PPTXNotesDoc;

      // 3. Extract text from the notes slide
      return this.extractTextFromNotes(notesDoc);

    } catch (error) {
      logger.warn(`Failed to extract notes for slide ${slideNumber}`, { error });
      return '';
    }
  }

  private extractTextFromNotes(doc: PPTXNotesDoc): string {
    const texts: string[] = [];
    
    // Notes are usually in p:notes -> p:cSld -> p:spTree -> p:sp -> p:txBody
    // But structure can vary. We'll search for all text runs 'a:t' recursively or via known path.
    
    // Simplify: Look for spTree
    const spTree = doc?.notes?.cSld?.spTree;
    if (!spTree) return '';

    const shapes = toTypedArray(spTree.sp);
    
    for (const shape of shapes) {
      // Check if it's a body text placeholder (usually type="body")
      // But we can just grab all text
      const textBody = shape.txBody;
      if (!textBody) continue;

      const paragraphs = toTypedArray(textBody.p);
      for (const p of paragraphs) {
        const runs = toTypedArray(p.r);
        for (const r of runs) {
          if (r.t !== undefined) {
            texts.push(String(r.t));
          }
        }
        texts.push('\n'); // Paragraph break
      }
    }

    return texts.join('').trim();
  }
}

export interface SpeakerNotesResult {
  slideNumber: number;
  notes: string;
}

export const extractSpeakerNotes = async (
  zip: JSZip,
  slideNumber: number,
): Promise<SpeakerNotesResult> => {
  const parser = new PPTXNotesParser();
  const notes = await parser.extractNotes(zip, slideNumber);
  return { slideNumber, notes };
};

export const extractAllSpeakerNotes = async (
  zip: JSZip,
  slideCount: number,
): Promise<SpeakerNotesResult[]> => {
  const results: SpeakerNotesResult[] = [];
  for (let i = 1; i <= slideCount; i += 1) {
    const result = await extractSpeakerNotes(zip, i);
    results.push(result);
  }
  return results;
};
