/**
 * PPTX XML Types
 * Interfaces para estruturas XML parseadas de arquivos PPTX
 * Usado por notes-parser, image-parser, text-parser, etc.
 */

/**
 * Representa uma relação no arquivo .rels
 * Nota: fast-xml-parser pode usar @_ como prefixo de atributos dependendo da config
 */
export interface PPTXRelationship {
  // Formato sem prefixo
  Id?: string;
  Type?: string;
  Target?: string;
  TargetMode?: string;
  // Formato com prefixo @_ (usado quando attributeNamePrefix: '@_')
  '@_Id'?: string;
  '@_Type'?: string;
  '@_Target'?: string;
  '@_TargetMode'?: string;
}

/**
 * Documento de relacionamentos
 */
export interface PPTXRelationshipsDoc {
  Relationships?: {
    Relationship?: PPTXRelationship | PPTXRelationship[];
  };
}

/**
 * Text run (a:r) - texto formatado
 */
export interface PPTXTextRun {
  t?: string | number;
  rPr?: PPTXRunProperties;
}

/**
 * Propriedades de formatação de texto
 */
export interface PPTXRunProperties {
  b?: boolean | number;
  i?: boolean | number;
  u?: string;
  sz?: number;
  lang?: string;
  solidFill?: {
    srgbClr?: { val?: string };
    schemeClr?: { val?: string };
  };
}

/**
 * Parágrafo (a:p)
 */
export interface PPTXParagraph {
  r?: PPTXTextRun | PPTXTextRun[];
  pPr?: PPTXParagraphProperties;
  endParaRPr?: PPTXRunProperties;
}

/**
 * Propriedades de parágrafo
 */
export interface PPTXParagraphProperties {
  algn?: 'l' | 'ctr' | 'r' | 'just';
  lvl?: number;
  indent?: number;
  buNone?: Record<string, unknown>;
  buChar?: { char?: string };
  buAutoNum?: { type?: string };
}

/**
 * Text body (p:txBody)
 */
export interface PPTXTextBody {
  p?: PPTXParagraph | PPTXParagraph[];
  bodyPr?: Record<string, unknown>;
  lstStyle?: Record<string, unknown>;
}

/**
 * Shape (p:sp)
 */
export interface PPTXShape {
  nvSpPr?: {
    cNvPr?: { id?: number; name?: string };
    cNvSpPr?: { txBox?: boolean };
    nvPr?: { ph?: { type?: string; idx?: number } };
  };
  spPr?: PPTXShapeProperties;
  txBody?: PPTXTextBody;
  style?: Record<string, unknown>;
}

/**
 * Propriedades de shape
 */
export interface PPTXShapeProperties {
  xfrm?: {
    off?: { x?: number; y?: number };
    ext?: { cx?: number; cy?: number };
  };
  prstGeom?: { prst?: string };
  solidFill?: Record<string, unknown>;
  ln?: Record<string, unknown>;
}

/**
 * Picture (p:pic)
 */
export interface PPTXPicture {
  nvPicPr?: {
    cNvPr?: { id?: number; name?: string; descr?: string };
    cNvPicPr?: Record<string, unknown>;
    nvPr?: Record<string, unknown>;
  };
  blipFill?: {
    blip?: {
      'r:embed'?: string;
      '@_r:embed'?: string;
      cstate?: string;
    };
    srcRect?: Record<string, unknown>;
    stretch?: Record<string, unknown>;
  };
  spPr?: PPTXShapeProperties;
}

/**
 * Shape tree (p:spTree)
 */
export interface PPTXShapeTree {
  nvGrpSpPr?: Record<string, unknown>;
  grpSpPr?: Record<string, unknown>;
  sp?: PPTXShape | PPTXShape[];
  pic?: PPTXPicture | PPTXPicture[];
  graphicFrame?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Common slide data (p:cSld)
 */
export interface PPTXCommonSlideData {
  spTree?: PPTXShapeTree;
  name?: string;
  bg?: Record<string, unknown>;
}

/**
 * Slide document
 */
export interface PPTXSlideDoc {
  sld?: {
    cSld?: PPTXCommonSlideData;
  };
}

/**
 * Notes slide document
 */
export interface PPTXNotesDoc {
  notes?: {
    cSld?: PPTXCommonSlideData;
  };
}

/**
 * Type guard helpers
 */
export function isRelationship(obj: unknown): obj is PPTXRelationship {
  return typeof obj === 'object' && obj !== null && 'Type' in obj;
}

/**
 * Helper para converter valor único ou array em array tipado
 */
export function toTypedArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Helper para extrair texto de um TextBody
 */
export function extractTextFromBody(textBody: PPTXTextBody | undefined): string {
  if (!textBody) return '';
  
  const texts: string[] = [];
  const paragraphs = toTypedArray(textBody.p);
  
  for (const p of paragraphs) {
    const runs = toTypedArray(p.r);
    for (const r of runs) {
      if (r.t !== undefined) {
        texts.push(String(r.t));
      }
    }
  }
  
  return texts.join(' ').trim();
}

/**
 * Helper para encontrar imagens em shapes
 */
export function findEmbedId(picture: PPTXPicture): string | undefined {
  const blip = picture.blipFill?.blip;
  if (!blip) return undefined;
  
  // fast-xml-parser pode usar diferentes formatos para atributos
  return blip['r:embed'] || blip['@_r:embed'];
}

/**
 * Resultado de formatação de texto extraído (usado em parsing)
 * Diferente de PPTXTextFormatting em pptx-ast.types que é formatação inline
 */
export interface PPTXTextFormattingResult {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: string;
  fontSize?: number;
  color?: string;
  position?: {
    paragraphIndex: number;
    runIndex: number;
  };
}

/**
 * Hyperlink extraído de slide
 */
export interface PPTXHyperlink {
  text: string;
  url?: string;
  rId?: string;
  tooltip?: string;
  position?: {
    paragraphIndex: number;
    runIndex: number;
  };
}
