
export interface TimelineProject {
  id: string;
  duration: number; // in seconds
  fps: number;
  tracks: TimelineTrack[];
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'shape';
  name: string;
  locked: boolean;
  visible: boolean;
  elements: TimelineElement[];
  muted?: boolean;
  solo?: boolean;
  height?: number;
}

export interface TimelineElement {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  properties: ElementProperties;
  keyframes: Keyframe[];
}

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: any;
  easing: EasingFunction;
}

export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic';

export interface ElementProperties {
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  opacity?: number;
  [key: string]: any;
}
