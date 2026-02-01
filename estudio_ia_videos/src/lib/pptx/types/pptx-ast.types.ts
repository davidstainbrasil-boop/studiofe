/**
 * PPTX AST Types
 * Interfaces tipadas para nodes do AST de arquivos PPTX
 * Substitui usos de `any` no parsing de PPTX
 */

/**
 * Tipos de node no AST
 */
export type PPTXNodeType = 
  | 'presentation'
  | 'slide'
  | 'text'
  | 'title'
  | 'body'
  | 'notes'
  | 'image'
  | 'shape'
  | 'table'
  | 'chart'
  | 'paragraph'
  | 'run'
  | 'unknown';

/**
 * Subtipos para nodes específicos
 */
export type PPTXNodeSubtype = 
  | 'title'
  | 'body'
  | 'notes'
  | 'subtitle'
  | 'header'
  | 'footer'
  | 'content'
  | 'placeholder'
  | undefined;

/**
 * Node base do AST PPTX
 */
export interface PPTXAstNode {
  type: PPTXNodeType;
  subtype?: PPTXNodeSubtype;
  value?: string;
  children?: PPTXAstNode[];
  attributes?: PPTXNodeAttributes;
}

/**
 * Atributos comuns de nodes
 */
export interface PPTXNodeAttributes {
  id?: string;
  name?: string;
  idx?: number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  rotation?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Node raiz da apresentação
 */
export interface PPTXPresentationNode extends PPTXAstNode {
  type: 'presentation';
  properties?: PPTXPresentationProperties;
  children: PPTXSlideNode[];
}

/**
 * Propriedades da apresentação
 */
export interface PPTXPresentationProperties {
  title?: string;
  author?: string;
  subject?: string;
  description?: string;
  created?: string;
  modified?: string;
  slideCount?: number;
  slideWidth?: number;
  slideHeight?: number;
}

/**
 * Node de slide
 */
export interface PPTXSlideNode extends PPTXAstNode {
  type: 'slide';
  slideNumber?: number;
  layout?: string;
  children: PPTXContentNode[];
}

/**
 * Node de conteúdo (texto, imagem, shape, etc.)
 */
export interface PPTXContentNode extends PPTXAstNode {
  type: 'text' | 'title' | 'body' | 'notes' | 'image' | 'shape' | 'table' | 'chart' | 'unknown';
}

/**
 * Node de texto
 */
export interface PPTXTextNode extends PPTXAstNode {
  type: 'text' | 'title' | 'body' | 'notes';
  value?: string;
  formatting?: PPTXTextFormatting;
  children?: PPTXParagraphNode[];
}

/**
 * Node de parágrafo
 */
export interface PPTXParagraphNode extends PPTXAstNode {
  type: 'paragraph';
  children?: PPTXRunNode[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  bulletType?: 'none' | 'bullet' | 'number';
  level?: number;
}

/**
 * Node de run (texto formatado)
 */
export interface PPTXRunNode extends PPTXAstNode {
  type: 'run';
  value: string;
  formatting?: PPTXTextFormatting;
}

/**
 * Formatação de texto
 */
export interface PPTXTextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  hyperlink?: string;
}

/**
 * Node de imagem
 */
export interface PPTXImageNode extends PPTXAstNode {
  type: 'image';
  src?: string;
  embedId?: string;
  contentType?: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * Node de shape
 */
export interface PPTXShapeNode extends PPTXAstNode {
  type: 'shape';
  shapeType?: string;
  fill?: PPTXFillStyle;
  stroke?: PPTXStrokeStyle;
  text?: PPTXTextNode;
}

/**
 * Estilo de preenchimento
 */
export interface PPTXFillStyle {
  type: 'solid' | 'gradient' | 'pattern' | 'none';
  color?: string;
  gradientStops?: Array<{ position: number; color: string }>;
}

/**
 * Estilo de contorno
 */
export interface PPTXStrokeStyle {
  color?: string;
  width?: number;
  dashStyle?: 'solid' | 'dash' | 'dot' | 'dashDot';
}

/**
 * Type guards para verificação de tipos em runtime
 */

/**
 * Verifica se um valor desconhecido é um PPTXAstNode válido
 */
export function isValidPPTXAstNode(value: unknown): value is PPTXAstNode {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.type === 'string';
}

/**
 * Verifica se um valor desconhecido é um PPTXPresentationNode
 */
export function isPresentationNode(node: unknown): node is PPTXPresentationNode {
  if (!isValidPPTXAstNode(node)) return false;
  return node.type === 'presentation';
}

export function isSlideNode(node: PPTXAstNode | unknown): node is PPTXSlideNode {
  if (!isValidPPTXAstNode(node)) return false;
  return node.type === 'slide';
}

export function isTextNode(node: PPTXAstNode | unknown): node is PPTXTextNode {
  if (!isValidPPTXAstNode(node)) return false;
  return ['text', 'title', 'body', 'notes'].includes(node.type);
}

export function isImageNode(node: PPTXAstNode | unknown): node is PPTXImageNode {
  if (!isValidPPTXAstNode(node)) return false;
  return node.type === 'image';
}

export function isShapeNode(node: PPTXAstNode | unknown): node is PPTXShapeNode {
  if (!isValidPPTXAstNode(node)) return false;
  return node.type === 'shape';
}

/**
 * Helper para converter array ou undefined para array tipado
 */
export function toNodeArray(value: PPTXAstNode | PPTXAstNode[] | undefined): PPTXAstNode[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Helper para extrair texto recursivamente de um node
 */
export function extractTextFromNode(node: PPTXAstNode): string {
  let text = '';
  
  if (node.value) {
    text += node.value;
  }
  
  if (node.children && Array.isArray(node.children)) {
    text += node.children.map(child => extractTextFromNode(child)).join(' ');
  }
  
  return text.trim();
}

/**
 * Helper para encontrar node por tipo/subtipo
 */
export function findNodeByType(
  parentNode: PPTXAstNode, 
  type: PPTXNodeType | PPTXNodeSubtype
): PPTXAstNode | undefined {
  if (!parentNode.children || !Array.isArray(parentNode.children)) {
    return undefined;
  }
  
  return parentNode.children.find(
    child => child.type === type || child.subtype === type
  );
}

/**
 * Helper para encontrar todos os nodes de um tipo
 */
export function findAllNodesByType(
  parentNode: PPTXAstNode, 
  type: PPTXNodeType
): PPTXAstNode[] {
  if (!parentNode.children || !Array.isArray(parentNode.children)) {
    return [];
  }
  
  return parentNode.children.filter(child => child.type === type);
}
