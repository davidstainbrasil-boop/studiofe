/**
 * 🎯 Universal Slide Element Parser
 * 
 * Combines layout, text, and theme parsing into a unified element structure
 * for high-fidelity video rendering.
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { PPTXThemeParser, PPTXTheme } from './theme-parser';
import { PPTXAnimationParser, AnimationEffect, SlideTransition } from './animation-parser';
import { logger } from '@lib/logger';
import { PPTXRelationship } from '../types/pptx-xml.types';

// ===== EMU (English Metric Units) to Pixels Conversion =====
// PowerPoint uses EMUs internally (914400 EMUs = 1 inch, 1 inch = 96 pixels at standard DPI)
const EMU_PER_INCH = 914400;
const PIXELS_PER_INCH = 96;
const EMU_TO_PX = (emu: number) => Math.round((emu / EMU_PER_INCH) * PIXELS_PER_INCH);

// Font size in PowerPoint is in hundredths of a point
const FONT_SIZE_MULTIPLIER = 100;

// ===== TYPE DEFINITIONS =====

export interface ElementLayout {
  x: number; // pixels
  y: number; // pixels
  width: number; // pixels
  height: number; // pixels
  rotation: number; // degrees
  zIndex: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number; // points
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
  color: string; // hex
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
}

export interface ShapeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: string;
}

export interface UniversalSlideElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  name: string;
  layout: ElementLayout;
  content: {
    text?: string;
    src?: string; // for images
    paragraphs?: TextParagraph[]; // for rich text
  };
  textStyle?: TextStyle;
  shapeStyle?: ShapeStyle;
  animations?: ElementAnimation[];
}

export interface TextParagraph {
  runs: TextRun[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  bulletType?: 'none' | 'bullet' | 'number';
}

export interface TextRun {
  text: string;
  style: Partial<TextStyle>;
}

export interface ElementAnimation {
  type: 'fade' | 'slide' | 'zoom' | 'wipe';
  trigger: 'onLoad' | 'onClick' | 'afterPrevious';
  duration: number; // ms
  delay: number; // ms
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface UniversalSlide {
  slideNumber: number;
  elements: UniversalSlideElement[];
  background?: {
    type: 'solid' | 'gradient' | 'image';
    color?: string;
    src?: string;
  };
  notes?: string;
  duration: number; // seconds
  audio?: {
    src: string;
    duration: number;
  };
  transition?: {
    type: string;
    duration: number;
  };
}

export interface UniversalPresentationData {
  success: boolean;
  slides: UniversalSlide[];
  theme?: PPTXTheme;
  metadata: {
    title: string;
    author: string;
    totalSlides: number;
    dimensions: { width: number; height: number };
  };
  errors: string[];
}

// ===== PARSER CLASS =====

export class UniversalElementParser {
  private xmlParser: XMLParser;
  private themeParser: PPTXThemeParser;
  private animationParser: PPTXAnimationParser;
  private static readonly COMPONENT = 'UniversalElementParser';
  
  // Default slide dimensions (standard 16:9)
  private slideWidth = 1920;
  private slideHeight = 1080;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
    });
    this.themeParser = new PPTXThemeParser();
    this.animationParser = new PPTXAnimationParser();
  }

  /**
   * Parse entire PPTX into UniversalPresentationData
   */
  async parsePresentation(buffer: Buffer | ArrayBuffer): Promise<UniversalPresentationData> {
    const errors: string[] = [];
    const slides: UniversalSlide[] = [];
    
    try {
      const zip = await JSZip.loadAsync(buffer);
      
      // Extract theme first (for color resolution)
      const themeResult = await this.themeParser.extractTheme(buffer);
      const theme = themeResult.success ? themeResult.theme : undefined;
      
      // Get slide dimensions from presentation.xml
      await this.extractSlideDimensions(zip);
      
      // Find all slide files
      const slideFiles = Object.keys(zip.files)
        .filter((f) => f.match(/ppt\/slides\/slide\d+\.xml/))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
          const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
          return numA - numB;
        });
      
      // Process each slide
      for (const slideFile of slideFiles) {
        const match = slideFile.match(/slide(\d+)\.xml/);
        if (!match) continue;
        
        const slideNumber = parseInt(match[1], 10);
        
        try {
          const slide = await this.parseSlide(zip, slideNumber, theme);
          slides.push(slide);
        } catch (error) {
          const msg = `Failed to parse slide ${slideNumber}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(msg);
          logger.warn(msg, { component: UniversalElementParser.COMPONENT });
        }
      }
      
      // Extract metadata
      const metadata = await this.extractMetadata(zip);
      
      return {
        success: errors.length === 0,
        slides,
        theme,
        metadata: {
          ...metadata,
          totalSlides: slides.length,
          dimensions: { width: this.slideWidth, height: this.slideHeight }
        },
        errors
      };
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to parse presentation', error instanceof Error ? error : new Error(msg), { 
        component: UniversalElementParser.COMPONENT 
      });
      return {
        success: false,
        slides: [],
        metadata: { title: '', author: '', totalSlides: 0, dimensions: { width: 1920, height: 1080 } },
        errors: [msg]
      };
    }
  }

  /**
   * Parse a single slide
   */
  async parseSlide(zip: JSZip, slideNumber: number, theme?: PPTXTheme): Promise<UniversalSlide> {
    const slidePath = `ppt/slides/slide${slideNumber}.xml`;
    const slideFile = zip.file(slidePath);
    
    if (!slideFile) {
      throw new Error(`Slide ${slideNumber} not found`);
    }
    
    const slideXml = await slideFile.async('string');
    const slideData = this.xmlParser.parse(slideXml);
    
    const elements: UniversalSlideElement[] = [];
    const spTree = slideData?.['p:sld']?.['p:cSld']?.['p:spTree'];
    
    if (spTree) {
      // Parse shapes (text boxes)
      const shapes = this.toArray(spTree['p:sp']);
      for (let i = 0; i < shapes.length; i++) {
        const element = this.parseShape(shapes[i], i, theme);
        if (element) elements.push(element);
      }
      
      // Parse pictures
      const pictures = this.toArray(spTree['p:pic']);
      for (let i = 0; i < pictures.length; i++) {
        const element = await this.parsePicture(zip, pictures[i], slideNumber, shapes.length + i);
        if (element) elements.push(element);
      }
    }
    
    // Extract animations
    const animationResult = await this.animationParser.extractAnimations(zip, slideNumber);
    
    // Map animations to elements
    if (animationResult.success && animationResult.animations && animationResult.animations.length > 0) {
      for (const anim of animationResult.animations) {
        if (anim.targetElementId) {
          const targetElement = elements.find(el => el.id === anim.targetElementId);
          if (targetElement) {
            if (!targetElement.animations) {
              targetElement.animations = [];
            }
            targetElement.animations.push(this.mapAnimationEffect(anim));
          }
        }
      }
    }
    
    // Extract slide transition
    const transition = animationResult.transition ? {
      type: animationResult.transition.type,
      duration: animationResult.transition.duration || 500
    } : undefined;
    
    // Extract notes
    const notes = await this.extractNotes(zip, slideNumber);
    
    // Calculate duration based on content + animations
    const textContent = elements
      .filter(e => e.type === 'text')
      .map(e => e.content.text || '')
      .join(' ');
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const animDuration = (animationResult.totalAnimationDuration || 0) / 1000; // convert to seconds
    const baseDuration = Math.max(5, Math.ceil(wordCount / 2.5) + animDuration);
    
    return {
      slideNumber,
      elements,
      notes,
      duration: baseDuration,
      transition,
      background: this.parseBackground(slideData, theme)
    };
  }

  /**
   * Map PPTX AnimationEffect to ElementAnimation
   */
  private mapAnimationEffect(anim: AnimationEffect): ElementAnimation {
    // Map PPTX effect names to our supported animation types
    const typeMap: Record<string, ElementAnimation['type']> = {
      'fade': 'fade',
      'fly': 'slide',
      'zoom': 'zoom',
      'wipe': 'wipe',
      'appear': 'fade',
      'dissolve': 'fade',
      'box': 'zoom',
      'blinds': 'wipe'
    };
    
    return {
      type: typeMap[anim.effectName] || 'fade',
      trigger: anim.effectType === 'entrance' ? 'onLoad' : 'afterPrevious',
      duration: anim.duration || 500,
      delay: anim.delay || 0
    };
  }

  /**
   * Parse a shape element (text box, rectangle, etc.)
   */
  private parseShape(shape: Record<string, any>, index: number, theme?: PPTXTheme): UniversalSlideElement | null {
    try {
      // Get shape ID and name
      const nvSpPr = shape['p:nvSpPr'];
      const cNvPr = nvSpPr?.['p:cNvPr'];
      const id = cNvPr?.['@_id'] || `shape-${index}`;
      const name = cNvPr?.['@_name'] || `Shape ${index}`;
      
      // Get layout from spPr > xfrm
      const spPr = shape['p:spPr'];
      const xfrm = spPr?.['a:xfrm'];
      
      const layout: ElementLayout = {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        rotation: 0,
        zIndex: index
      };
      
      if (xfrm) {
        const off = xfrm['a:off'];
        const ext = xfrm['a:ext'];
        
        if (off) {
          layout.x = EMU_TO_PX(this.getNumber(off['@_x']));
          layout.y = EMU_TO_PX(this.getNumber(off['@_y']));
        }
        
        if (ext) {
          layout.width = EMU_TO_PX(this.getNumber(ext['@_cx']));
          layout.height = EMU_TO_PX(this.getNumber(ext['@_cy']));
        }
        
        if (xfrm['@_rot']) {
          // Rotation is in 1/60000 of a degree
          layout.rotation = Math.round(this.getNumber(xfrm['@_rot']) / 60000);
        }
      }
      
      // Check if this is a text box
      const txBody = shape['p:txBody'];
      if (!txBody) {
        // It's a shape without text
        return {
          id: String(id),
          type: 'shape',
          name: String(name),
          layout,
          content: {},
          shapeStyle: this.parseShapeStyle(spPr, theme)
        };
      }
      
      // Parse text content with full styling
      const paragraphs = this.parseParagraphs(txBody, theme);
      const plainText = paragraphs.map(p => p.runs.map(r => r.text).join('')).join('\n');
      
      // Get default text style from first run
      const defaultStyle = paragraphs[0]?.runs[0]?.style || {};
      
      return {
        id: String(id),
        type: 'text',
        name: String(name),
        layout,
        content: {
          text: plainText,
          paragraphs
        },
        textStyle: {
          fontFamily: defaultStyle.fontFamily || 'Arial',
          fontSize: defaultStyle.fontSize || 18,
          fontWeight: defaultStyle.fontWeight || 'normal',
          fontStyle: defaultStyle.fontStyle || 'normal',
          textDecoration: defaultStyle.textDecoration || 'none',
          color: defaultStyle.color || '#000000',
          textAlign: paragraphs[0]?.alignment || 'left'
        },
        shapeStyle: this.parseShapeStyle(spPr, theme)
      };
      
    } catch (error) {
      logger.warn(`Failed to parse shape at index ${index}`, { 
        component: UniversalElementParser.COMPONENT,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Parse text paragraphs with full styling
   */
  private parseParagraphs(txBody: Record<string, any>, theme?: PPTXTheme): TextParagraph[] {
    const paragraphs: TextParagraph[] = [];
    const aParagraphs = this.toArray(txBody['a:p']);
    
    for (const para of aParagraphs) {
      const pPr = para['a:pPr'];
      const alignment = this.parseAlignment(pPr?.['@_algn']);
      
      const runs: TextRun[] = [];
      const aRuns = this.toArray(para['a:r']);
      
      for (const run of aRuns) {
        const text = this.extractText(run['a:t']);
        if (!text) continue;
        
        const rPr = run['a:rPr'];
        const style = this.parseRunStyle(rPr, theme);
        
        runs.push({ text, style });
      }
      
      if (runs.length > 0) {
        paragraphs.push({ runs, alignment });
      }
    }
    
    return paragraphs;
  }

  /**
   * Parse run (text span) style properties
   */
  private parseRunStyle(rPr: Record<string, any> | undefined, theme?: PPTXTheme): Partial<TextStyle> {
    const style: Partial<TextStyle> = {};
    
    if (!rPr) return style;
    
    // Font family
    const latin = rPr['a:latin'];
    if (latin?.['@_typeface']) {
      style.fontFamily = latin['@_typeface'];
    } else if (theme) {
      style.fontFamily = theme.fonts.minorFont.typeface;
    }
    
    // Font size (in hundredths of a point)
    if (rPr['@_sz']) {
      style.fontSize = Math.round(this.getNumber(rPr['@_sz']) / FONT_SIZE_MULTIPLIER);
    }
    
    // Bold
    if (rPr['@_b'] === 1 || rPr['@_b'] === '1' || rPr['@_b'] === true) {
      style.fontWeight = 'bold';
    }
    
    // Italic
    if (rPr['@_i'] === 1 || rPr['@_i'] === '1' || rPr['@_i'] === true) {
      style.fontStyle = 'italic';
    }
    
    // Underline
    if (rPr['@_u'] && rPr['@_u'] !== 'none') {
      style.textDecoration = 'underline';
    }
    
    // Color
    const solidFill = rPr['a:solidFill'];
    if (solidFill) {
      style.color = this.parseColor(solidFill, theme);
    }
    
    return style;
  }

  /**
   * Parse color from PPTX color node
   */
  private parseColor(colorNode: Record<string, any>, theme?: PPTXTheme): string {
    // Direct RGB color
    const srgbClr = colorNode['a:srgbClr'];
    if (srgbClr?.['@_val']) {
      return `#${srgbClr['@_val']}`;
    }
    
    // Theme color reference
    const schemeClr = colorNode['a:schemeClr'];
    if (schemeClr?.['@_val'] && theme) {
      const colorName = schemeClr['@_val'] as keyof typeof theme.colorScheme;
      // Map PowerPoint color names to theme
      const colorMap: Record<string, keyof typeof theme.colorScheme> = {
        'tx1': 'dark1',
        'tx2': 'dark2',
        'bg1': 'light1',
        'bg2': 'light2',
        'accent1': 'accent1',
        'accent2': 'accent2',
        'accent3': 'accent3',
        'accent4': 'accent4',
        'accent5': 'accent5',
        'accent6': 'accent6',
        'dk1': 'dark1',
        'dk2': 'dark2',
        'lt1': 'light1',
        'lt2': 'light2'
      };
      const mappedName = colorMap[colorName] || colorName;
      if (theme.colorScheme[mappedName]) {
        return theme.colorScheme[mappedName];
      }
    }
    
    return '#000000'; // Default black
  }

  /**
   * Parse shape style (fill, border, etc.)
   */
  private parseShapeStyle(spPr: Record<string, any> | undefined, theme?: PPTXTheme): ShapeStyle {
    const style: ShapeStyle = {};
    
    if (!spPr) return style;
    
    // Background fill
    const solidFill = spPr['a:solidFill'];
    if (solidFill) {
      style.backgroundColor = this.parseColor(solidFill, theme);
    }
    
    // No fill
    if (spPr['a:noFill']) {
      style.backgroundColor = 'transparent';
    }
    
    // Border/outline
    const ln = spPr['a:ln'];
    if (ln) {
      if (ln['a:solidFill']) {
        style.borderColor = this.parseColor(ln['a:solidFill'], theme);
      }
      if (ln['@_w']) {
        style.borderWidth = EMU_TO_PX(this.getNumber(ln['@_w']));
      }
    }
    
    return style;
  }

  /**
   * Parse picture element
   */
  private async parsePicture(
    zip: JSZip, 
    pic: Record<string, any>, 
    slideNumber: number,
    index: number
  ): Promise<UniversalSlideElement | null> {
    try {
      const nvPicPr = pic['p:nvPicPr'];
      const cNvPr = nvPicPr?.['p:cNvPr'];
      const id = cNvPr?.['@_id'] || `pic-${index}`;
      const name = cNvPr?.['@_name'] || `Image ${index}`;
      
      // Get layout
      const spPr = pic['p:spPr'];
      const xfrm = spPr?.['a:xfrm'];
      
      const layout: ElementLayout = {
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        rotation: 0,
        zIndex: index
      };
      
      if (xfrm) {
        const off = xfrm['a:off'];
        const ext = xfrm['a:ext'];
        
        if (off) {
          layout.x = EMU_TO_PX(this.getNumber(off['@_x']));
          layout.y = EMU_TO_PX(this.getNumber(off['@_y']));
        }
        
        if (ext) {
          layout.width = EMU_TO_PX(this.getNumber(ext['@_cx']));
          layout.height = EMU_TO_PX(this.getNumber(ext['@_cy']));
        }
        
        if (xfrm['@_rot']) {
          layout.rotation = Math.round(this.getNumber(xfrm['@_rot']) / 60000);
        }
      }
      
      // Get image reference
      const blipFill = pic['p:blipFill'];
      const blip = blipFill?.['a:blip'];
      const embedId = blip?.['@_r:embed'];
      
      let imageSrc = '';
      
      if (embedId) {
        // Find image path from relationships
        const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
        const relsFile = zip.file(relsPath);
        
        if (relsFile) {
          const relsXml = await relsFile.async('string');
          const relsData = this.xmlParser.parse(relsXml);
          const relationships = this.toArray(relsData?.['Relationships']?.['Relationship']) as unknown as PPTXRelationship[];
          
          const imageRel = relationships.find((r) => r['@_Id'] === embedId);
          if (imageRel) {
            const target = imageRel['@_Target'] as string;
            imageSrc = target.replace('../', '/ppt/');
          }
        }
      }
      
      return {
        id: String(id),
        type: 'image',
        name: String(name),
        layout,
        content: { src: imageSrc }
      };
      
    } catch (error) {
      logger.warn(`Failed to parse picture at index ${index}`, {
        component: UniversalElementParser.COMPONENT,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Parse slide background
   */
  private parseBackground(slideData: Record<string, any>, theme?: PPTXTheme): UniversalSlide['background'] {
    const cSld = slideData?.['p:sld']?.['p:cSld'];
    const bg = cSld?.['p:bg'];
    
    if (!bg) {
      return { type: 'solid', color: theme?.colorScheme.light1 || '#FFFFFF' };
    }
    
    const bgPr = bg['p:bgPr'];
    if (bgPr?.['a:solidFill']) {
      return {
        type: 'solid',
        color: this.parseColor(bgPr['a:solidFill'], theme)
      };
    }
    
    return { type: 'solid', color: '#FFFFFF' };
  }

  /**
   * Extract speaker notes
   */
  private async extractNotes(zip: JSZip, slideNumber: number): Promise<string | undefined> {
    const notesPath = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    const notesFile = zip.file(notesPath);
    
    if (!notesFile) return undefined;
    
    try {
      const notesXml = await notesFile.async('string');
      const notesData = this.xmlParser.parse(notesXml);
      
      const texts: string[] = [];
      const spTree = notesData?.['p:notes']?.['p:cSld']?.['p:spTree'];
      const shapes = this.toArray(spTree?.['p:sp']);
      
      for (const shape of shapes) {
        const txBody = shape?.['p:txBody'];
        if (!txBody) continue;
        
        const paragraphs = this.toArray(txBody['a:p']);
        for (const para of paragraphs) {
          const runs = this.toArray(para['a:r']);
          for (const run of runs) {
            const text = this.extractText(run['a:t']);
            if (text) texts.push(text);
          }
        }
      }
      
      return texts.join(' ').trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract slide dimensions from presentation.xml
   */
  private async extractSlideDimensions(zip: JSZip): Promise<void> {
    const presFile = zip.file('ppt/presentation.xml');
    if (!presFile) return;
    
    try {
      const presXml = await presFile.async('string');
      const presData = this.xmlParser.parse(presXml);
      
      const sldSz = presData?.['p:presentation']?.['p:sldSz'];
      if (sldSz) {
        this.slideWidth = EMU_TO_PX(this.getNumber(sldSz['@_cx']));
        this.slideHeight = EMU_TO_PX(this.getNumber(sldSz['@_cy']));
      }
    } catch {
      // Keep defaults
    }
  }

  /**
   * Extract presentation metadata
   */
  private async extractMetadata(zip: JSZip): Promise<{ title: string; author: string }> {
    const coreFile = zip.file('docProps/core.xml');
    
    const metadata = { title: 'Untitled', author: 'Unknown' };
    
    if (!coreFile) return metadata;
    
    try {
      const coreXml = await coreFile.async('string');
      const coreData = this.xmlParser.parse(coreXml);
      const coreProps = coreData?.['cp:coreProperties'];
      
      if (coreProps?.['dc:title']) {
        const title = coreProps['dc:title'];
        metadata.title = typeof title === 'string' ? title : title?.['#text'] || 'Untitled';
      }
      
      if (coreProps?.['dc:creator']) {
        const author = coreProps['dc:creator'];
        metadata.author = typeof author === 'string' ? author : author?.['#text'] || 'Unknown';
      }
    } catch {
      // Keep defaults
    }
    
    return metadata;
  }

  // ===== UTILITY METHODS =====

  private parseAlignment(algn: string | undefined): 'left' | 'center' | 'right' | 'justify' {
    switch (algn) {
      case 'ctr': return 'center';
      case 'r': return 'right';
      case 'just': return 'justify';
      default: return 'left';
    }
  }

  private extractText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj['#text'] === 'string') return obj['#text'];
      if (typeof obj['__cdata'] === 'string') return obj['__cdata'];
    }
    return '';
  }

  private getNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  }

  private toArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
}

// ===== EXPORT HELPER =====

export async function parseUniversalPresentation(buffer: Buffer | ArrayBuffer): Promise<UniversalPresentationData> {
  const parser = new UniversalElementParser();
  return parser.parsePresentation(buffer);
}
