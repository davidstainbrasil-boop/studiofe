/**
 * 🎬 FFmpeg Transitions - Sistema de Transições de Slides
 * 
 * Implementa transições visuais entre slides usando filtros FFmpeg
 * Suporta: fade, slide, zoom, wipe, dissolve, push
 */

import { Logger } from '@lib/logger';

const logger = new Logger('ffmpeg-transitions');

// =============================================================================
// Types
// =============================================================================

export type TransitionType = 
  | 'none'
  | 'fade'
  | 'fadeblack'
  | 'fadewhite'
  | 'slideleft'
  | 'slideright'
  | 'slideup'
  | 'slidedown'
  | 'smoothleft'
  | 'smoothright'
  | 'smoothup'
  | 'smoothdown'
  | 'circlecrop'
  | 'circleclose'
  | 'circleopen'
  | 'dissolve'
  | 'horzclose'
  | 'horzopen'
  | 'vertclose'
  | 'vertopen'
  | 'pixelize'
  | 'radial'
  | 'rectcrop'
  | 'wipeleft'
  | 'wiperight'
  | 'wipeup'
  | 'wipedown'
  | 'wipetl'
  | 'wipetr'
  | 'wipebl'
  | 'wipebr'
  | 'zoomin'
  | 'zoomout';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // seconds
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  offset?: number; // start offset in seconds
}

export interface SlideInfo {
  imagePath: string;
  duration: number; // seconds
  transition?: TransitionConfig;
}

export interface TransitionBuildOptions {
  slides: SlideInfo[];
  width: number;
  height: number;
  fps: number;
  outputPath?: string;
}

export interface FFmpegFilterGraph {
  inputs: string[];
  filterComplex: string;
  outputMap: string;
}

// =============================================================================
// FFmpeg Transition Filter Builder
// =============================================================================

export class FFmpegTransitionBuilder {
  private width: number;
  private height: number;
  private fps: number;

  constructor(width: number = 1920, height: number = 1080, fps: number = 30) {
    this.width = width;
    this.height = height;
    this.fps = fps;
  }

  /**
   * Builds FFmpeg filter complex for slide transitions using xfade
   */
  buildFilterComplex(slides: SlideInfo[]): FFmpegFilterGraph {
    if (slides.length === 0) {
      throw new Error('At least one slide is required');
    }

    if (slides.length === 1) {
      // Single slide, no transitions needed
      return {
        inputs: ['-loop', '1', '-t', String(slides[0].duration), '-i', slides[0].imagePath],
        filterComplex: `[0:v]scale=${this.width}:${this.height}:force_original_aspect_ratio=decrease,pad=${this.width}:${this.height}:-1:-1:color=black,setsar=1[v]`,
        outputMap: '[v]',
      };
    }

    const inputs: string[] = [];
    const filters: string[] = [];

    // Build input arguments for each slide
    slides.forEach((slide, index) => {
      inputs.push('-loop', '1', '-t', String(slide.duration), '-i', slide.imagePath);
    });

    // Scale and pad each input to match target resolution
    slides.forEach((_, index) => {
      filters.push(
        `[${index}:v]scale=${this.width}:${this.height}:force_original_aspect_ratio=decrease,` +
        `pad=${this.width}:${this.height}:-1:-1:color=black,setsar=1,fps=${this.fps}[v${index}]`
      );
    });

    // Build xfade chain
    let currentOutput = 'v0';
    let cumulativeOffset = 0;

    for (let i = 1; i < slides.length; i++) {
      const prevSlide = slides[i - 1];
      const transition = slides[i].transition || { type: 'fade', duration: 0.5 };
      
      // Calculate offset (when the transition should start)
      cumulativeOffset += prevSlide.duration - transition.duration;
      
      const xfadeTransition = this.getXfadeTransition(transition.type);
      const outputLabel = i === slides.length - 1 ? 'vout' : `xf${i}`;
      
      filters.push(
        `[${currentOutput}][v${i}]xfade=transition=${xfadeTransition}:duration=${transition.duration}:offset=${cumulativeOffset}[${outputLabel}]`
      );
      
      currentOutput = outputLabel;
    }

    return {
      inputs,
      filterComplex: filters.join(';'),
      outputMap: `[${currentOutput}]`,
    };
  }

  /**
   * Maps our transition types to FFmpeg xfade transitions
   */
  private getXfadeTransition(type: TransitionType): string {
    const transitionMap: Record<TransitionType, string> = {
      'none': 'fade',
      'fade': 'fade',
      'fadeblack': 'fadeblack',
      'fadewhite': 'fadewhite',
      'slideleft': 'slideleft',
      'slideright': 'slideright',
      'slideup': 'slideup',
      'slidedown': 'slidedown',
      'smoothleft': 'smoothleft',
      'smoothright': 'smoothright',
      'smoothup': 'smoothup',
      'smoothdown': 'smoothdown',
      'circlecrop': 'circlecrop',
      'circleclose': 'circleclose',
      'circleopen': 'circleopen',
      'dissolve': 'dissolve',
      'horzclose': 'horzclose',
      'horzopen': 'horzopen',
      'vertclose': 'vertclose',
      'vertopen': 'vertopen',
      'pixelize': 'pixelize',
      'radial': 'radial',
      'rectcrop': 'rectcrop',
      'wipeleft': 'wipeleft',
      'wiperight': 'wiperight',
      'wipeup': 'wipeup',
      'wipedown': 'wipedown',
      'wipetl': 'wipetl',
      'wipetr': 'wipetr',
      'wipebl': 'wipebl',
      'wipebr': 'wipebr',
      'zoomin': 'zoomin',
      'zoomout': 'fadewhite', // zoomout não existe no xfade, usando fadewhite como fallback
    };

    return transitionMap[type] || 'fade';
  }

  /**
   * Builds complete FFmpeg command arguments for rendering slides with transitions
   */
  buildFFmpegArgs(options: TransitionBuildOptions): string[] {
    const { slides, outputPath } = options;
    const filterGraph = this.buildFilterComplex(slides);
    
    const args: string[] = [];

    // Add inputs
    args.push(...filterGraph.inputs);

    // Add filter complex
    args.push('-filter_complex', filterGraph.filterComplex);

    // Map output
    args.push('-map', filterGraph.outputMap);

    // Video codec settings
    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p'
    );

    // Output
    if (outputPath) {
      args.push('-y', outputPath);
    }

    return args;
  }

  /**
   * Build command for concatenating video segments with transitions
   */
  buildConcatWithTransitions(
    segments: { path: string; transition?: TransitionConfig }[],
    outputPath: string
  ): string[] {
    if (segments.length === 0) {
      throw new Error('At least one segment is required');
    }

    if (segments.length === 1) {
      // Single segment, just copy
      return [
        '-i', segments[0].path,
        '-c', 'copy',
        '-y', outputPath
      ];
    }

    const args: string[] = [];
    const filters: string[] = [];

    // Add inputs
    segments.forEach(segment => {
      args.push('-i', segment.path);
    });

    // Build xfade chain for video segments
    let currentOutput = '0:v';
    let cumulativeOffset = 0;

    for (let i = 1; i < segments.length; i++) {
      const transition = segments[i].transition || { type: 'fade', duration: 0.5 };
      const xfadeTransition = this.getXfadeTransition(transition.type);
      const outputLabel = i === segments.length - 1 ? 'vout' : `xf${i}`;
      
      // We need to get the duration of the previous segment for offset calculation
      // For now, assume transition starts at end of previous minus transition duration
      filters.push(
        `[${currentOutput}][${i}:v]xfade=transition=${xfadeTransition}:duration=${transition.duration}:offset=${cumulativeOffset}[${outputLabel}]`
      );
      
      currentOutput = outputLabel;
    }

    args.push('-filter_complex', filters.join(';'));
    args.push('-map', `[${currentOutput}]`);

    // Also concatenate audio if present
    if (segments.length > 1) {
      const audioConcat = segments.map((_, i) => `[${i}:a]`).join('');
      // Add audio filter
      args.push('-map', '0:a?'); // Map audio from first input if exists
    }

    // Video codec settings
    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-y', outputPath
    );

    return args;
  }
}

// =============================================================================
// Transition Presets
// =============================================================================

export const TRANSITION_PRESETS = {
  professional: {
    type: 'fade' as TransitionType,
    duration: 0.5,
    easing: 'ease-in-out' as const,
  },
  dynamic: {
    type: 'slideleft' as TransitionType,
    duration: 0.3,
    easing: 'ease-out' as const,
  },
  smooth: {
    type: 'smoothleft' as TransitionType,
    duration: 0.7,
    easing: 'ease-in-out' as const,
  },
  dramatic: {
    type: 'fadeblack' as TransitionType,
    duration: 1.0,
    easing: 'linear' as const,
  },
  modern: {
    type: 'circlecrop' as TransitionType,
    duration: 0.5,
    easing: 'ease-out' as const,
  },
  minimal: {
    type: 'dissolve' as TransitionType,
    duration: 0.3,
    easing: 'linear' as const,
  },
  none: {
    type: 'none' as TransitionType,
    duration: 0,
    easing: 'linear' as const,
  },
} as const;

export type TransitionPreset = keyof typeof TRANSITION_PRESETS;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get transition config from preset name
 */
export function getTransitionFromPreset(preset: TransitionPreset): TransitionConfig {
  return { ...TRANSITION_PRESETS[preset] };
}

/**
 * Get list of available transitions
 */
export function getAvailableTransitions(): { value: TransitionType; label: string }[] {
  return [
    { value: 'none', label: 'Sem transição' },
    { value: 'fade', label: 'Fade' },
    { value: 'fadeblack', label: 'Fade para preto' },
    { value: 'fadewhite', label: 'Fade para branco' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'slideleft', label: 'Deslizar para esquerda' },
    { value: 'slideright', label: 'Deslizar para direita' },
    { value: 'slideup', label: 'Deslizar para cima' },
    { value: 'slidedown', label: 'Deslizar para baixo' },
    { value: 'smoothleft', label: 'Suave esquerda' },
    { value: 'smoothright', label: 'Suave direita' },
    { value: 'wipeleft', label: 'Wipe esquerda' },
    { value: 'wiperight', label: 'Wipe direita' },
    { value: 'wipeup', label: 'Wipe cima' },
    { value: 'wipedown', label: 'Wipe baixo' },
    { value: 'circlecrop', label: 'Círculo crop' },
    { value: 'circleopen', label: 'Círculo abrindo' },
    { value: 'circleclose', label: 'Círculo fechando' },
    { value: 'radial', label: 'Radial' },
    { value: 'pixelize', label: 'Pixelizar' },
    { value: 'zoomin', label: 'Zoom in' },
    { value: 'zoomout', label: 'Zoom out' },
  ];
}

/**
 * Validate transition duration
 */
export function validateTransitionDuration(
  duration: number,
  slideDuration: number
): { valid: boolean; adjustedDuration: number; warning?: string } {
  const minDuration = 0.1;
  const maxDuration = Math.min(slideDuration * 0.5, 2.0); // Max 50% of slide or 2 seconds

  if (duration < minDuration) {
    return {
      valid: false,
      adjustedDuration: minDuration,
      warning: `Duração mínima da transição é ${minDuration}s`,
    };
  }

  if (duration > maxDuration) {
    return {
      valid: false,
      adjustedDuration: maxDuration,
      warning: `Duração máxima da transição é ${maxDuration}s (50% da duração do slide)`,
    };
  }

  return { valid: true, adjustedDuration: duration };
}

// =============================================================================
// Exports
// =============================================================================

export default FFmpegTransitionBuilder;
