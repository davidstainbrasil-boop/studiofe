/**
 * SPRINT 5: Video Project Multi-Scene Data Structures
 *
 * Architecture: Scene-based timeline (Premiere/DaVinci Resolve style)
 * - Each PPTX slide becomes a Scene
 * - Each Scene has multiple Tracks (avatar, audio, video, text, overlay)
 * - Each Track contains TimelineElements with temporal properties
 */

import { TransitionConfig } from '@lib/video/scene-transitions';

export interface CanvasElement {
  id: string;
  type: 'video' | 'image' | 'text' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  src?: string;
  text?: string;
  fill?: string;
  zIndex: number;
  startTime: number;
  duration: number;
  trackId: string;
}

export type VideoResolution = '720p' | '1080p' | '4K';
export type VideoFPS = 24 | 30 | 60;
export type TrackType = 'avatar' | 'audio' | 'video' | 'text' | 'image' | 'overlay';
export type TransitionType = 'cut' | 'dissolve' | 'slide' | 'wipe' | 'fade';
export type AvatarEmotion = 'neutral' | 'happy' | 'concerned' | 'serious' | 'excited';

/**
 * Main Video Project - Contains multiple scenes
 */
export interface VideoProject {
  id: string;
  name: string;
  description?: string;
  scenes: Scene[];
  globalSettings: GlobalSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Global Project Settings
 */
export interface GlobalSettings {
  resolution: VideoResolution;
  fps: VideoFPS;
  duration: number; // Total duration in seconds
  backgroundColor?: string;
}

/**
 * Scene - Represents a single slide/section of the video
 * Each PPTX slide becomes one Scene
 */
export interface Scene {
  id: string;
  name: string;
  duration: number; // Duration in seconds
  thumbnail?: string; // Base64 or URL
  elements: CanvasElement[]; // Canvas elements for editing
  backgroundColor: string;
  tracks: Track[];
  order: number; // Scene order in project
  transition?: TransitionConfig;
}

/**
 * Track - Container for timeline elements
 * Similar to Premiere Pro tracks
 */
export interface Track {
  id: string;
  type: TrackType;
  name: string;
  elements: TimelineElement[];
  locked: boolean;
  muted?: boolean; // For audio/video tracks
  visible: boolean;
  height?: number; // Track height in timeline UI (px)
  color?: string; // Track color for visual identification
}

/**
 * Timeline Element - Individual element on timeline
 * Has temporal properties (start, duration, end)
 */
export interface TimelineElement {
  id: string;
  trackId: string;
  sceneId: string;
  startTime: number; // Start time in seconds
  duration: number; // Duration in seconds
  endTime: number; // End time in seconds (startTime + duration)
  type: TrackType;
  content: TimelineElementContent;
  animations: TimelineAnimations;
  locked?: boolean;
  name?: string;
}

/**
 * Content specific to each timeline element type
 */
export interface TimelineElementContent {
  // Avatar content
  avatarId?: string;
  lipSyncData?: LipSyncAnimation;
  emotion?: AvatarEmotion;
  lookAt?: string; // ID of avatar to look at

  // Text content
  text?: string;
  textStyle?: TextStyle;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  animation?: Record<string, unknown>;
  textAlign?: CanvasTextAlign | string;
  textBaseline?: CanvasTextBaseline | string;
  maxWidth?: number;

  // Media content (image/video)
  src?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  avatarGlbUrl?: string;
  blendShapes?: Record<string, number>;

  // Audio content
  audioUrl?: string;
  waveformData?: number[];
  volume?: number; // 0-1

  // Spatial properties
  position?: { x: number; y: number };
  scale?: number;
  rotation?: number | { x: number; y: number; z: number };
  opacity?: number;
  width?: number;
  height?: number;
}

/**
 * Text styling properties
 */
export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: number | string;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing?: number;
  textShadow?: string;
}

/**
 * Timeline animations (transitions, effects)
 */
export interface TimelineAnimations {
  fadeIn?: number; // Duration of fade-in effect (seconds)
  fadeOut?: number; // Duration of fade-out effect (seconds)
  transition?: TransitionType;
  transitionDuration?: number;
  customAnimation?: CustomAnimation;
}

/**
 * Custom keyframe-based animation
 */
export interface CustomAnimation {
  keyframes: AnimationKeyframe[];
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Animation keyframe
 */
export interface AnimationKeyframe {
  time: number; // Time in seconds
  properties: {
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
    opacity?: number;
  };
}

/**
 * Lip-Sync Animation Data
 * From Rhubarb/Azure TTS
 */
export interface LipSyncAnimation {
  phonemes: Phoneme[];
  duration: number;
  visemeData?: VisemeFrame[];
}

/**
 * Phoneme with timing
 */
export interface Phoneme {
  phoneme: string;
  startTime: number;
  endTime: number;
}

/**
 * Viseme frame for facial animation
 */
export interface VisemeFrame {
  time: number;
  viseme: string;
  weight: number;
}

/**
 * Avatar Conversation System
 * For multi-avatar dialogue
 */
export interface Conversation {
  id: string;
  name: string;
  participants: string[]; // Avatar IDs
  dialogues: Dialogue[];
  totalDuration: number;
}

/**
 * Single dialogue in conversation
 */
export interface Dialogue {
  id: string;
  avatarId: string;
  text: string;
  startTime: number;
  duration: number;
  emotion?: AvatarEmotion;
  lookAt?: string; // ID of avatar being looked at
  audioUrl?: string;
  lipSyncData?: LipSyncAnimation;
}

/**
 * Avatar Definition
 */
export interface Avatar {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  glbUrl: string; // 3D model URL
  thumbnailUrl: string;
  customization?: AvatarCustomization;
  category?: 'professional' | 'casual' | 'character';
}

/**
 * Avatar customization options
 */
export interface AvatarCustomization {
  skinTone?: string;
  hairStyle?: string;
  hairColor?: string;
  outfit?: string;
  accessories?: string[];
}

/**
 * PPTX Import Result
 */
export interface PPTXImportResult {
  project: VideoProject;
  warnings: string[];
  slidesProcessed: number;
  elementsExtracted: number;
}

/**
 * Timeline UI State
 */
export interface TimelineState {
  currentTime: number; // Playback head position (seconds)
  zoom: number; // Zoom level (pixels per second)
  selectedElements: string[]; // Selected timeline element IDs
  isPlaying: boolean;
  loop: boolean;
  snapToGrid: boolean;
  gridSize: number; // Grid snap size (seconds)
}

/**
 * Playback Controls
 */
export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
}
