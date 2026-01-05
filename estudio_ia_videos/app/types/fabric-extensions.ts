/**
 * Extended Fabric.js Type Definitions
 * Shared type extensions for custom Fabric.js properties
 */

import type * as Fabric from 'fabric';

// Object with custom ID property
export interface FabricObjectWithId extends Fabric.Object {
  id?: string;
}

// IText with custom ID property
export interface FabricITextWithId extends Fabric.IText {
  id?: string;
}

// Image with custom ID property  
export interface FabricImageWithId extends Fabric.Image {
  id?: string;
}

// Canvas with extended context properties for GPU acceleration
export interface FabricCanvasExtended extends Fabric.Canvas {
  contextContainer?: CanvasRenderingContext2D;
  contextTop?: CanvasRenderingContext2D;
}

// Fabric selection events
export interface FabricSelectionEvent {
  selected?: FabricObjectWithId[];
  deselected?: FabricObjectWithId[];
  target?: FabricObjectWithId;
  e?: MouseEvent | TouchEvent;
}

// Fabric modification events
export interface FabricModificationEvent {
  target?: FabricObjectWithId;
  transform?: unknown;
}

// Fabric mouse events
export interface FabricMouseEvent {
  target?: FabricObjectWithId;
  e: MouseEvent | TouchEvent;
  pointer?: { x: number; y: number };
  absolutePointer?: { x: number; y: number };
}

// Type guard for FabricObjectWithId
export function isFabricObjectWithId(obj: Fabric.Object): obj is FabricObjectWithId {
  return 'id' in obj;
}

// Generate unique ID for Fabric objects
export function generateFabricId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Extend Fabric.Object with id property safely
export function setFabricObjectId(obj: Fabric.Object, id?: string): FabricObjectWithId {
  const objWithId = obj as FabricObjectWithId;
  objWithId.id = id || generateFabricId();
  return objWithId;
}
