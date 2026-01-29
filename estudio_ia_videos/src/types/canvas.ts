export interface CanvasElement {
  id: string;
  type: 'image' | 'video' | 'text' | 'avatar' | 'shape';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  src?: string;
  text?: string;
  fill?: string;
  locked: boolean;
  visible: boolean;
  draggable: boolean;
  zIndex: number;
}

export interface CanvasScene {
  id: string;
  name: string;
  elements: CanvasElement[];
  backgroundColor: string;
  width: number;
  height: number;
}
