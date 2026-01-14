
import { XMLParser } from 'fast-xml-parser';

type XmlNode = Record<string, unknown>;

export class PPTXTextParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseAttributeValue: true,
      trimValues: true,
      cdataPropName: '__cdata',
    });
  }

  public extractTextFromSlideXml(slideXml: string): string[] {
    const slideContent = this.xmlParser.parse(slideXml);
    return this.extractText(slideContent);
  }

  private extractText(slideContent: unknown): string[] {
    const texts: string[] = [];
    if (!this.isRecord(slideContent)) {
      return texts;
    }

    // Try to find spTree (Shape Tree)
    const spTree = this.getNested(slideContent, ['p:sld', 'p:cSld', 'p:spTree']);
    if (!this.isRecord(spTree)) {
      return texts;
    }

    const shapes = this.toArray(spTree['p:sp']);
    for (const shape of shapes) {
      if (!this.isRecord(shape)) continue;
      
      const textBody = this.isRecord(shape['p:txBody']) 
        ? (shape['p:txBody'] as XmlNode) 
        : undefined;
        
      if (!textBody) continue;

      const paragraphs = this.toArray(textBody['a:p']);
      for (const paragraph of paragraphs) {
        if (!this.isRecord(paragraph)) continue;
        const runs = this.toArray(paragraph['a:r']);
        
        for (const run of runs) {
          if (!this.isRecord(run)) continue;
          
          const textValue = run['a:t'];
          if (typeof textValue === 'string' || typeof textValue === 'number') {
            texts.push(String(textValue));
          } else if (this.isRecord(textValue) && typeof textValue.__cdata === 'string') {
            texts.push(textValue.__cdata);
          }
        }
      }
    }

    return texts;
  }

  private isRecord(value: unknown): value is XmlNode {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private getNested(source: XmlNode, path: string[]): unknown {
    return path.reduce<unknown>((acc, key) => {
      if (!this.isRecord(acc)) {
        return undefined;
      }
      return acc[key];
    }, source);
  }
}
