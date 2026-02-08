/**
 * SPRINT 5: PPTX Import to Scenes Converter
 *
 * Converts PowerPoint slides into Timeline Scenes
 * Each slide becomes a Scene with extracted elements
 */

import JSZip from 'jszip';
import { logger } from '@/lib/logger';
import type {
  VideoProject,
  Scene,
  Track,
  TimelineElement,
  CanvasElement,
  PPTXImportResult,
} from '@/types/video-project';

/**
 * PPTX Slide parsed data
 */
interface PPTXSlide {
  index: number;
  title?: string;
  texts: PPTXText[];
  images: PPTXImage[];
  shapes: PPTXShape[];
  backgroundColor?: string;
}

interface PPTXText {
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

interface PPTXImage {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

interface PPTXShape {
  type: 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
}

const DEFAULT_SLIDE_DURATION = 5; // seconds

/**
 * Import PPTX file and convert to VideoProject
 */
export async function importPPTX(file: File): Promise<PPTXImportResult> {
  const warnings: string[] = [];
  let slidesProcessed = 0;
  let elementsExtracted = 0;

  try {
    // Load PPTX as ZIP
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Parse slides
    const slides = await parsePPTXSlides(zip, warnings);
    slidesProcessed = slides.length;

    if (slides.length === 0) {
      warnings.push('No slides found in PPTX file');
    }

    // Convert slides to scenes
    const scenes: Scene[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const scene = await convertSlideToScene(slide, zip, i);
      scenes.push(scene);
      elementsExtracted += scene.elements.length;
    }

    // Create VideoProject
    const project: VideoProject = {
      id: `project-${Date.now()}`,
      name: file.name.replace(/\.pptx?$/i, ''),
      description: `Imported from ${file.name}`,
      scenes,
      globalSettings: {
        resolution: '1080p',
        fps: 30,
        duration: scenes.reduce((sum, s) => sum + s.duration, 0),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      project,
      warnings,
      slidesProcessed,
      elementsExtracted,
    };
  } catch (error) {
    warnings.push(
      `Failed to import PPTX: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );

    // Return empty project on error
    return {
      project: createEmptyProject(file.name),
      warnings,
      slidesProcessed: 0,
      elementsExtracted: 0,
    };
  }
}

/**
 * Parse PPTX slides from ZIP
 */
async function parsePPTXSlides(zip: JSZip, warnings: string[]): Promise<PPTXSlide[]> {
  const slides: PPTXSlide[] = [];

  // Find all slide XML files
  const slideFiles = Object.keys(zip.files).filter(
    (path) => path.startsWith('ppt/slides/slide') && path.endsWith('.xml'),
  );

  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
    const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
    return numA - numB;
  });

  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    try {
      const slideXML = await zip.file(slideFile)?.async('string');
      if (!slideXML) {
        warnings.push(`Failed to read slide ${i + 1}`);
        continue;
      }

      const slide = parseSlideXML(slideXML, i);
      slides.push(slide);
    } catch (error) {
      warnings.push(
        `Error parsing slide ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  return slides;
}

/**
 * Parse individual slide XML
 */
function parseSlideXML(xml: string, index: number): PPTXSlide {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const slide: PPTXSlide = {
    index,
    texts: [],
    images: [],
    shapes: [],
  };

  // Extract text elements
  const textElements = doc.querySelectorAll('a\\:t, t');
  textElements.forEach((textEl, textIndex) => {
    const content = textEl.textContent?.trim() || '';
    if (content) {
      // Try to get title from first text element
      if (textIndex === 0 && !slide.title) {
        slide.title = content;
      }

      slide.texts.push({
        content,
        x: 100 + (textIndex % 2) * 500,
        y: 100 + Math.floor(textIndex / 2) * 150,
        width: 800,
        height: 100,
        fontSize: 32,
        fontFamily: 'Inter',
        color: '#000000',
        align: 'left',
      });
    }
  });

  // Extract images (referenced in slide)
  const imageRels = doc.querySelectorAll('a\\:blip, blip');
  imageRels.forEach((imgEl, imgIndex) => {
    const embedId = imgEl.getAttribute('r:embed') || imgEl.getAttribute('embed');
    if (embedId) {
      slide.images.push({
        path: `ppt/media/image${imgIndex + 1}.png`, // Approximate path
        x: 100,
        y: 100 + imgIndex * 400,
        width: 600,
        height: 400,
        index: imgIndex,
      });
    }
  });

  // Extract background color
  const bgColorEl = doc.querySelector('a\\:srgbClr, srgbClr');
  if (bgColorEl) {
    const val = bgColorEl.getAttribute('val');
    if (val) {
      slide.backgroundColor = `#${val}`;
    }
  }

  return slide;
}

/**
 * Convert slide to Scene with tracks
 */
async function convertSlideToScene(
  slide: PPTXSlide,
  zip: JSZip,
  sceneIndex: number,
): Promise<Scene> {
  const elements: CanvasElement[] = [];
  const tracks: Track[] = [];

  // Create default tracks
  const textTrack: Track = {
    id: `track-text-${sceneIndex}`,
    type: 'text',
    name: 'Text',
    elements: [],
    locked: false,
    visible: true,
    color: '#f59e0b',
  };

  const imageTrack: Track = {
    id: `track-image-${sceneIndex}`,
    type: 'image',
    name: 'Images',
    elements: [],
    locked: false,
    visible: true,
    color: '#ec4899',
  };

  // Convert texts to canvas elements
  for (let i = 0; i < slide.texts.length; i++) {
    const text = slide.texts[i];
    const elementId = `element-text-${sceneIndex}-${i}`;

    const textElement: CanvasElement = {
      id: elementId,
      type: 'text',
      text: text.content,
      fill: text.color || '#000000',
      x: text.x,
      y: text.y,
      width: text.width,
      height: text.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: i,
      startTime: 0,
      duration: DEFAULT_SLIDE_DURATION,
      trackId: textTrack.id,
    };

    elements.push(textElement);

    // Add to timeline
    const timelineElement: TimelineElement = {
      id: `timeline-${elementId}`,
      trackId: textTrack.id,
      sceneId: `scene-${sceneIndex}`,
      startTime: 0,
      duration: DEFAULT_SLIDE_DURATION,
      endTime: DEFAULT_SLIDE_DURATION,
      type: 'text',
      content: {
        text: text.content,
        textStyle: {
          fontSize: text.fontSize || 32,
          fontFamily: text.fontFamily || 'Inter',
          fontWeight: text.fontWeight || 400,
          color: text.color || '#000000',
          align: text.align || 'left',
          lineHeight: 1.2,
        },
        position: { x: text.x, y: text.y },
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      animations: {
        fadeIn: 0.3,
        fadeOut: 0.3,
      },
    };

    textTrack.elements.push(timelineElement);
  }

  // Convert images to canvas elements
  for (let i = 0; i < slide.images.length; i++) {
    const image = slide.images[i];
    const elementId = `element-image-${sceneIndex}-${i}`;

    try {
      // Extract image from PPTX
      const imageFile = zip.file(image.path);
      if (imageFile) {
        const imageBlob = await imageFile.async('blob');
        const imageUrl = URL.createObjectURL(imageBlob);

        const imageElement: CanvasElement = {
          id: elementId,
          type: 'image',
          src: imageUrl,
          x: image.x,
          y: image.y,
          width: image.width,
          height: image.height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: slide.texts.length + i,
          startTime: 0,
          duration: DEFAULT_SLIDE_DURATION,
          trackId: imageTrack.id,
        };

        elements.push(imageElement);

        // Add to timeline
        const timelineElement: TimelineElement = {
          id: `timeline-${elementId}`,
          trackId: imageTrack.id,
          sceneId: `scene-${sceneIndex}`,
          startTime: 0,
          duration: DEFAULT_SLIDE_DURATION,
          endTime: DEFAULT_SLIDE_DURATION,
          type: 'image',
          content: {
            src: imageUrl,
            position: { x: image.x, y: image.y },
            scale: 1,
            rotation: 0,
            opacity: 1,
          },
          animations: {
            fadeIn: 0.3,
            fadeOut: 0.3,
          },
        };

        imageTrack.elements.push(timelineElement);
      }
    } catch (error) {
      logger.warn(`Failed to extract image ${i} from slide ${sceneIndex}:`, error);
    }
  }

  // Add tracks to scene
  if (textTrack.elements.length > 0) {
    tracks.push(textTrack);
  }
  if (imageTrack.elements.length > 0) {
    tracks.push(imageTrack);
  }

  return {
    id: `scene-${sceneIndex}`,
    name: slide.title || `Slide ${sceneIndex + 1}`,
    duration: DEFAULT_SLIDE_DURATION,
    elements,
    backgroundColor: slide.backgroundColor || '#ffffff',
    tracks,
    order: sceneIndex,
  };
}

/**
 * Create empty project (fallback)
 */
function createEmptyProject(fileName: string): VideoProject {
  return {
    id: `project-${Date.now()}`,
    name: fileName.replace(/\.pptx?$/i, ''),
    description: 'Empty project (import failed)',
    scenes: [],
    globalSettings: {
      resolution: '1080p',
      fps: 30,
      duration: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Preview PPTX thumbnails without full import
 */
export async function previewPPTX(file: File): Promise<{
  slideCount: number;
  thumbnails: string[];
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const slideFiles = Object.keys(zip.files).filter(
      (path) => path.startsWith('ppt/slides/slide') && path.endsWith('.xml'),
    );

    // For now, just return count (thumbnail generation would require rendering)
    return {
      slideCount: slideFiles.length,
      thumbnails: [],
    };
  } catch (error) {
    logger.error('Failed to preview PPTX:', error instanceof Error ? error : new Error(String(error)));
    return {
      slideCount: 0,
      thumbnails: [],
    };
  }
}
