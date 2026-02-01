/**
 * Timeline Types for Video Studio
 * Core type definitions for timeline functionality
 */

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle' | 'effect' | 'overlay';
  elements: TimelineElement[];
  locked: boolean;
  muted: boolean;
  solo: boolean;
  height: number;
  color?: string;
}

export interface TimelineElement {
  id: string;
  trackId: string;
  type: string;
  startTime: number;
  endTime: number;
  duration: number;
  content: unknown;
  style?: Record<string, unknown>;
  transitions?: {
    in?: TransitionConfig;
    out?: TransitionConfig;
  };
}

export interface TransitionConfig {
  type: string;
  duration: number;
  easing?: string;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number;
  zoom: number;
  scrollPosition: number;
  selectedElements: string[];
  playbackState: 'playing' | 'paused' | 'stopped';
  loop: boolean;
  fps: number;
}

export interface TimelineSettings {
  snapToGrid: boolean;
  gridSize: number;
  autoScroll: boolean;
  showWaveforms: boolean;
  showThumbnails: boolean;
  rippleEdit: boolean;
}

export interface TimelineAction {
  type: string;
  payload: unknown;
  timestamp: number;
  undoable: boolean;
}

export interface TimelineSelection {
  elementIds: string[];
  trackIds: string[];
  timeRange?: {
    start: number;
    end: number;
  };
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color?: string;
  type?: 'chapter' | 'note' | 'sync';
}

export interface TimelineCursor {
  position: number;
  visible: boolean;
}

export interface TimelineExportOptions {
  format: 'mp4' | 'webm' | 'mov' | 'gif';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: '480p' | '720p' | '1080p' | '4k';
  fps: number;
  includeAudio: boolean;
  range?: {
    start: number;
    end: number;
  };
}

export type TimelineEventType = 
  | 'play'
  | 'pause'
  | 'stop'
  | 'seek'
  | 'select'
  | 'deselect'
  | 'add-element'
  | 'remove-element'
  | 'move-element'
  | 'resize-element'
  | 'add-track'
  | 'remove-track'
  | 'zoom'
  | 'scroll';

export interface TimelineEvent {
  type: TimelineEventType;
  payload: unknown;
  source: 'user' | 'system' | 'external';
}
