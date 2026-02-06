/**
 * 🎨 Visual Effects Service - UGC Video Generator
 * Aplica efeitos visuais (zoom, pan, transições) para vídeos
 */

import path from 'path';
import fs from 'fs-extra';

export interface VisualEffectsConfig {
  zoom?: {
    enabled: boolean;
    startScale?: number;
    endScale?: number;
    direction?: 'in' | 'out';
  };
  pan?: {
    enabled: boolean;
    direction?: 'left' | 'right' | 'up' | 'down';
    speed?: number;
  };
  transition?: {
    type: 'fade' | 'slide' | 'dissolve' | 'none';
    duration?: number;
  };
  colorCorrection?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
  };
}

export class VisualEffectsService {
  /**
   * Gera filtro complexo FFmpeg para efeitos visuais
   * @param effects Configuração de efeitos
   * @param width Largura do vídeo
   * @param height Altura do vídeo
   * @param duration Duração do vídeo em segundos
   * @param tempDir Diretório temporário para arquivos intermediários
   * @returns String do filtro complexo FFmpeg ou null se sem efeitos
   */
  static async applyVisualEffects(
    effects: VisualEffectsConfig,
    width: number,
    height: number,
    duration: number,
    tempDir: string
  ): Promise<string | null> {
    const filters: string[] = [];

    // Zoom effect (Ken Burns)
    if (effects.zoom?.enabled) {
      const startScale = effects.zoom.startScale ?? 1.0;
      const endScale = effects.zoom.endScale ?? 1.2;
      const scaleExpr = `${startScale}+(${endScale}-${startScale})*t/${duration}`;
      
      // zoompan filter
      filters.push(
        `zoompan=z='${scaleExpr}':d=${Math.floor(duration * 25)}:s=${width}x${height}`
      );
    }

    // Pan effect
    if (effects.pan?.enabled) {
      const speed = effects.pan.speed ?? 0.5;
      let xExpr = '0';
      let yExpr = '0';
      
      switch (effects.pan.direction) {
        case 'left':
          xExpr = `(iw-ow)*t/${duration}`;
          break;
        case 'right':
          xExpr = `(iw-ow)*(1-t/${duration})`;
          break;
        case 'up':
          yExpr = `(ih-oh)*t/${duration}`;
          break;
        case 'down':
          yExpr = `(ih-oh)*(1-t/${duration})`;
          break;
      }
      
      filters.push(`crop=iw*0.8:ih*0.8:${xExpr}:${yExpr}`);
    }

    // Color correction
    if (effects.colorCorrection) {
      const { brightness = 0, contrast = 1, saturation = 1 } = effects.colorCorrection;
      filters.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
    }

    // Transition (fade in/out)
    if (effects.transition?.type === 'fade') {
      const fadeDuration = effects.transition.duration ?? 0.5;
      filters.push(`fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${duration - fadeDuration}:d=${fadeDuration}`);
    }

    // Se não há efeitos, retorna null
    if (filters.length === 0) {
      return null;
    }

    // Combinar filtros
    return filters.join(',');
  }

  /**
   * Gera transição entre dois vídeos
   */
  static generateTransitionFilter(
    transitionType: 'fade' | 'slide' | 'dissolve' | 'none',
    duration: number = 0.5
  ): string | null {
    switch (transitionType) {
      case 'fade':
        return `xfade=transition=fade:duration=${duration}:offset=0`;
      case 'slide':
        return `xfade=transition=slideleft:duration=${duration}:offset=0`;
      case 'dissolve':
        return `xfade=transition=dissolve:duration=${duration}:offset=0`;
      case 'none':
      default:
        return null;
    }
  }

  /**
   * Cria overlay com texto (watermark, títulos)
   */
  static generateTextOverlay(
    text: string,
    options: {
      fontFile?: string;
      fontSize?: number;
      fontColor?: string;
      x?: string;
      y?: string;
      startTime?: number;
      endTime?: number;
    } = {}
  ): string {
    const {
      fontSize = 24,
      fontColor = 'white',
      x = '(w-text_w)/2',
      y = 'h-th-20',
      startTime,
      endTime
    } = options;

    let filter = `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${x}:y=${y}`;
    
    if (startTime !== undefined && endTime !== undefined) {
      filter += `:enable='between(t,${startTime},${endTime})'`;
    }

    return filter;
  }
}
