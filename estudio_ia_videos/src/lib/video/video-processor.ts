import { videoRenderEngine, RenderOptions } from './video-render-engine';
import type { Slide } from '@lib/types';
export interface SlideData {
  id?: string;
  content?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface VideoScene {
  id: string;
  startTime: number;
  endTime: number;
  type: 'video' | 'image' | 'text';
  content: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export class VideoProcessor {
  static async process(input: string, output: string, options: RenderOptions) {
    return videoRenderEngine.render(input, output, options);
  }

  static async convertSlidesToScenes(slides: (Slide | SlideData)[], options?: Partial<RenderOptions>): Promise<VideoScene[]> {
    return slides.map((slide, index) => ({
      id: slide.id || `scene-${index}`,
      startTime: index * 5,
      endTime: (index + 1) * 5,
      type: 'image',
      content: slide.content || '',
      duration: slide.duration || 5,
      metadata: slide as unknown as Record<string, unknown>
    }));
  }
}
