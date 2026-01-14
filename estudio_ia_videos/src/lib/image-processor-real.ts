/**
 * Image Processor Real
 * Processamento avançado de imagens para vídeos usando sharp
 */

import sharp from 'sharp';
import { logger } from '@lib/logger';

export interface ImageProcessOptions {
  resize?: { width: number; height: number; fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' };
  crop?: { left: number; top: number; width: number; height: number }; // sharp uses left/top
  filters?: Array<'blur' | 'sharpen' | 'grayscale' | 'sepia'>;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export class ImageProcessor {
  async process(inputBuffer: Buffer, options?: ImageProcessOptions): Promise<ProcessedImage> {
    logger.info('Processing image with options:', { component: 'ImageProcessor', options });
    
    let pipeline = sharp(inputBuffer);

    // Apply resize
    if (options?.resize) {
      pipeline = pipeline.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'cover',
      });
    }

    // Apply crop (Extract operation in sharp)
    // Note: older interface used x,y, new sharp uses left,top. We map x->left, y->top if needed or rely on updated interface
    if (options?.crop) {
      pipeline = pipeline.extract({
        left: options.crop.left,
        top: options.crop.top,
        width: options.crop.width,
        height: options.crop.height
      });
    }

    // Apply filters
    if (options?.filters) {
      for (const filter of options.filters) {
        if (filter === 'blur') pipeline = pipeline.blur(5);
        if (filter === 'sharpen') pipeline = pipeline.sharpen();
        if (filter === 'grayscale') pipeline = pipeline.grayscale();
        if (filter === 'sepia') {
           // Sharp doesn't have direct sepia. Use modulations or tint. 
           // Simple approximation: grayscale + tint (if supported) or just skip for now to avoid complexity
           // pipeline = pipeline.tint('#704214'); // requires ensuring colorspace
           pipeline = pipeline.modulate({ saturation: 0.5 }); // not exact sepia
        }
      }
    }

    // Format and Quality
    const format = options?.format || 'jpeg';
    const quality = options?.quality || 80;

    if (format === 'jpeg') pipeline = pipeline.jpeg({ quality });
    if (format === 'png') pipeline = pipeline.png({ quality });
    if (format === 'webp') pipeline = pipeline.webp({ quality });
    if (format === 'avif') pipeline = pipeline.avif({ quality });

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || format,
      size: outputBuffer.length,
    };
  }
  
  async processBatchImages(files: File[], options?: ImageProcessOptions): Promise<ProcessedImage[]> {
    logger.info(`Processing batch of ${files.length} images`, { component: 'ImageProcessor' });
    const results: ProcessedImage[] = [];
    
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Map old crop {x,y} to {left,top} if passed via options (handling potential legacy calls)
      const safeOptions = { ...options };
      if ((options as any)?.crop?.x !== undefined) {
         safeOptions.crop = {
             left: (options as any).crop.x,
             top: (options as any).crop.y,
             width: (options as any).crop.width,
             height: (options as any).crop.height
         };
      }

      const processed = await this.process(buffer, safeOptions);
      results.push(processed);
    }
    
    return results;
  }

  async optimizeForWeb(buffer: Buffer, options?: { quality?: number; maxWidth?: number }): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    sizes: { original: number; webp: number; jpeg: number };
  }> {
    logger.info('Optimizing for web (Real)', { component: 'ImageProcessor', options });
    
    const maxWidth = options?.maxWidth || 1200;
    const quality = options?.quality || 80;

    // 1. Generate WebP (Target)
    const webpBuffer = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    const webpMeta = await sharp(webpBuffer).metadata();

    // 2. Generate JPEG (Comparison)
    const jpegBuffer = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    // Only return the efficient one (WebP) as the main buffer
    return {
      buffer: webpBuffer,
      width: webpMeta.width || 0,
      height: webpMeta.height || 0,
      format: 'webp',
      sizes: {
        original: buffer.length,
        webp: webpBuffer.length,
        jpeg: jpegBuffer.length
      }
    };
  }
}

export const imageProcessor = new ImageProcessor();

export interface ProjectImageResult {
  success: boolean;
  processedImages?: ProcessedImage[];
  error?: string;
}

export const processProjectImages = async (
  projectId: string, 
  files: File[], 
  options?: ImageProcessOptions
): Promise<ProjectImageResult> => {
  logger.info(`Processing images for project: ${projectId}`, { component: 'ImageProcessor' });
  try {
    const processedImages = await imageProcessor.processBatchImages(files, options);
    // TODO: Upload to S3/Storage here if meant to be persistent immediately
    // For now we return the buffers as the API controller handles the response/upload logic or allows download
    return { 
      success: true, 
      processedImages 
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
