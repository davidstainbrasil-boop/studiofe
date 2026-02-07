/**
 * Google Slides Converter
 *
 * Converts Google Slides to internal PPTX-like format
 */

import { GooglePresentation, GoogleSlide } from './slides-importer';
import { Logger } from '@lib/logger';

const logger = new Logger('slides-converter');

// =============================================================================
// Types - Compatible with PPTX Processor output
// =============================================================================

export interface ConvertedSlide {
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  layout: string;
  images: string[];
  animations: unknown[];
  duration: number;
  shapes: number;
  textBlocks: number;
}

export interface ConvertedPresentation {
  success: boolean;
  slides: ConvertedSlide[];
  metadata: {
    title: string;
    author: string;
    totalSlides: number;
    application: string;
    dimensions: { width: number; height: number };
    source: 'google-slides';
    originalId: string;
  };
  assets: {
    images: string[];
    videos: string[];
    audio: string[];
  };
  timeline: {
    totalDuration: number;
    scenes: Array<{
      sceneId: string;
      slideNumber: number;
      startTime: number;
      endTime: number;
      transitions: unknown[];
    }>;
  };
  extractionStats: {
    textBlocks: number;
    images: number;
    shapes: number;
    charts: number;
    tables: number;
  };
}

// =============================================================================
// Duration Estimation
// =============================================================================

/**
 * Estimate slide duration based on content
 */
function estimateSlideDuration(slide: GoogleSlide): number {
  const baseTime = 5; // Base 5 seconds per slide

  // Add time for text content (rough estimate: 150 words per minute)
  const wordCount = (slide.content + ' ' + slide.notes).split(/\s+/).length;
  const textTime = Math.ceil(wordCount / 150) * 60; // seconds

  // Add time for images
  const imageTime = slide.imageUrls.length * 2; // 2 seconds per image

  // Cap at reasonable limits
  return Math.max(5, Math.min(60, baseTime + textTime + imageTime));
}

// =============================================================================
// Slides Converter Class
// =============================================================================

export class GoogleSlidesConverter {
  /**
   * Convert Google Presentation to internal format
   */
  convert(presentation: GooglePresentation): ConvertedPresentation {
    logger.info('Converting Google Slides presentation', {
      id: presentation.id,
      title: presentation.title,
      slideCount: presentation.slides.length,
    });

    // Convert slides
    const slides = presentation.slides.map((slide) => this.convertSlide(slide));

    // Collect all images
    const allImages = presentation.slides.flatMap((s) => s.imageUrls);

    // Calculate timeline
    let currentTime = 0;
    const scenes = slides.map((slide) => {
      const startTime = currentTime;
      const endTime = startTime + slide.duration;
      currentTime = endTime;

      return {
        sceneId: `scene_${slide.slideNumber}`,
        slideNumber: slide.slideNumber,
        startTime,
        endTime,
        transitions: [],
      };
    });

    const totalDuration = currentTime;

    // Calculate stats
    const stats = {
      textBlocks: slides.reduce((acc, s) => acc + s.textBlocks, 0),
      images: allImages.length,
      shapes: slides.reduce((acc, s) => acc + s.shapes, 0),
      charts: 0,
      tables: 0,
    };

    return {
      success: true,
      slides,
      metadata: {
        title: presentation.title,
        author: 'Google Slides User',
        totalSlides: slides.length,
        application: 'Google Slides',
        dimensions: {
          width: presentation.pageSize.width / 9525, // EMU to pixels (approx)
          height: presentation.pageSize.height / 9525,
        },
        source: 'google-slides',
        originalId: presentation.id,
      },
      assets: {
        images: allImages,
        videos: [],
        audio: [],
      },
      timeline: {
        totalDuration,
        scenes,
      },
      extractionStats: stats,
    };
  }

  /**
   * Convert a single slide
   */
  private convertSlide(slide: GoogleSlide): ConvertedSlide {
    const duration = estimateSlideDuration(slide);

    // Count text blocks (rough estimate)
    const textBlocks = (slide.content.match(/\n\n/g) || []).length + 1;

    return {
      slideNumber: slide.slideNumber,
      title: slide.title,
      content: slide.content,
      notes: slide.notes,
      layout: 'default',
      images: slide.imageUrls,
      animations: [],
      duration,
      shapes: 0, // Google Slides API doesn't easily expose shape count
      textBlocks,
    };
  }

  /**
   * Convert to PPTX-compatible format for pipeline
   */
  convertForPipeline(presentation: GooglePresentation): {
    projectId: string;
    slides: Array<{
      id: string;
      slideNumber: number;
      title: string;
      content: string;
      notes: string;
      imageUrl?: string;
      thumbnailUrl?: string;
      duration: number;
      selected: boolean;
    }>;
    metadata: {
      title: string;
      author: string;
      totalSlides: number;
    };
  } {
    const converted = this.convert(presentation);

    return {
      projectId: `gslides-${presentation.id}`,
      slides: presentation.slides.map((slide, index) => ({
        id: `slide-${slide.slideId}`,
        slideNumber: slide.slideNumber,
        title: slide.title,
        content: slide.content,
        notes: slide.notes,
        imageUrl: slide.imageUrls[0],
        thumbnailUrl: slide.thumbnailUrl,
        duration: converted.slides[index].duration,
        selected: true,
      })),
      metadata: {
        title: presentation.title,
        author: 'Google Slides User',
        totalSlides: presentation.slides.length,
      },
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createGoogleSlidesConverter(): GoogleSlidesConverter {
  return new GoogleSlidesConverter();
}

export default GoogleSlidesConverter;
