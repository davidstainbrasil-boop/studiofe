/**
 * 📦 Tipos compartilhados - UGC Video Generator
 */

// ============================================
// VIDEO CONFIGURATION
// ============================================

export interface VideoConfig {
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export const VIDEO_PRESETS: Record<string, VideoConfig> = {
  // Formato vertical (TikTok, Reels, Shorts)
  vertical_hd: { width: 1080, height: 1920, fps: 30, format: 'mp4', quality: 'high' },
  vertical_sd: { width: 720, height: 1280, fps: 30, format: 'mp4', quality: 'medium' },
  
  // Formato quadrado (Instagram Feed)
  square_hd: { width: 1080, height: 1080, fps: 30, format: 'mp4', quality: 'high' },
  
  // Formato horizontal (YouTube)
  horizontal_hd: { width: 1920, height: 1080, fps: 30, format: 'mp4', quality: 'high' },
  horizontal_4k: { width: 3840, height: 2160, fps: 30, format: 'mp4', quality: 'ultra' },
};

// ============================================
// RENDER PIPELINE
// ============================================

export type RenderStage = 
  | 'idle'
  | 'parsing'
  | 'generating_audio'
  | 'generating_frames'
  | 'rendering_video'
  | 'adding_subtitles'
  | 'encoding'
  | 'completed'
  | 'failed';

export interface RenderProgress {
  stage: RenderStage;
  progress: number;       // 0-100
  currentStep: string;
  eta?: number;           // segundos estimados
  error?: string;
}

export interface RenderResult {
  success: boolean;
  videoPath?: string;
  duration?: number;
  fileSize?: number;
  stages: {
    stage: RenderStage;
    duration: number;     // ms
    success: boolean;
    error?: string;
  }[];
  error?: string;
}

// ============================================
// SCENE & FRAMES
// ============================================

export interface FrameData {
  sceneId: string;
  frameIndex: number;
  imagePath: string;
  timestamp: number;      // segundos
  duration: number;       // duração deste frame
}

export interface SubtitleEntry {
  text: string;
  startTime: number;      // segundos
  endTime: number;
  style?: SubtitleStyle;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
  shadow?: boolean;
  outline?: boolean;
}

// ============================================
// TEMPLATES & BRANDING
// ============================================

export interface BrandConfig {
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  watermark?: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  videoConfig: VideoConfig;
  brand?: BrandConfig;
  transitions: {
    default: string;
    intro?: string;
    outro?: string;
  };
  subtitleStyle: SubtitleStyle;
}

// ============================================
// PROJECT
// ============================================

export interface UGCProject {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  scriptPath: string;
  outputPath?: string;
  template: string;
  videoConfig: VideoConfig;
  renderResult?: RenderResult;
}

// ============================================
// CLI OPTIONS
// ============================================

export interface CLIOptions {
  input: string;          // Caminho do script
  output?: string;        // Caminho do vídeo
  template?: string;      // Template a usar
  voice?: string;         // Voz do TTS
  preview?: boolean;      // Só mostrar preview
  verbose?: boolean;      // Logs detalhados
  force?: boolean;        // Sobrescrever output
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// API RESPONSES
// ============================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
