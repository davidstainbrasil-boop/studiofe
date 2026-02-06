/**
 * TalkingHeadPipelineService
 *
 * Generates talking-head videos for multiple slides using MuseTalk/SadTalker.
 * Called directly (not via HTTP) from the video generation pipeline.
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { PIPELINE_TIMEOUTS, withTimeout } from '@/lib/config/timeout-config';
import { getMuseTalkProvider } from './musetalk-provider';
import { getSadTalkerProvider } from './sadtalker-provider';

// =============================================================================
// Types
// =============================================================================

export interface TalkingHeadRequest {
  slideId: string;
  sourceImage: string; // URL or base64 of avatar face
  audioUrl: string;    // Local path or URL to TTS audio for this slide
}

export interface TalkingHeadResult {
  slideId: string;
  success: boolean;
  videoUrl?: string;
  localVideoPath?: string;
  provider?: 'musetalk' | 'sadtalker';
  error?: string;
}

export type ProgressCallback = (completed: number, total: number, slideId: string) => void;

// =============================================================================
// Service
// =============================================================================

const TEMP_DIR = join(process.cwd(), 'tmp', 'avatar-videos');

async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

/**
 * Download a remote video URL to a local temp file for FFmpeg processing
 */
async function downloadToLocal(videoUrl: string, slideId: string): Promise<string> {
  await ensureTempDir();

  const ext = videoUrl.includes('.webm') ? '.webm' : '.mp4';
  const localPath = join(TEMP_DIR, `avatar_${slideId}_${randomUUID()}${ext}`);

  // Handle local file paths (starting with /)
  if (videoUrl.startsWith('/') && !videoUrl.startsWith('//')) {
    const absolutePath = join(process.cwd(), 'public', videoUrl);
    if (existsSync(absolutePath)) {
      // Copy local file
      const { copyFile } = await import('fs/promises');
      await copyFile(absolutePath, localPath);
      return localPath;
    }
  }

  // Download remote URL
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download avatar video: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(localPath, buffer);

  return localPath;
}

/**
 * Generate a talking-head video for a single slide.
 * Tries MuseTalk first, falls back to SadTalker.
 */
async function generateSingle(request: TalkingHeadRequest): Promise<TalkingHeadResult> {
  const { slideId, sourceImage, audioUrl } = request;

  logger.info('Generating talking head for slide', { slideId });

  // Try MuseTalk first
  const museTalk = getMuseTalkProvider();
  if (museTalk.isAvailable()) {
    try {
      const result = await withTimeout(
        museTalk.generate({ sourceImage, audioUrl }),
        PIPELINE_TIMEOUTS.avatarPerSlide,
        `MuseTalk generation for slide ${slideId}`
      );

      if (result.success && result.videoUrl) {
        const localPath = await downloadToLocal(result.videoUrl, slideId);
        return {
          slideId,
          success: true,
          videoUrl: result.videoUrl,
          localVideoPath: localPath,
          provider: 'musetalk',
        };
      }

      logger.warn('MuseTalk returned unsuccessful result, trying SadTalker', {
        slideId,
        error: result.error,
      });
    } catch (error) {
      logger.warn('MuseTalk failed, falling back to SadTalker', {
        slideId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Fallback to SadTalker
  const sadTalker = getSadTalkerProvider();
  try {
    const result = await withTimeout(
      sadTalker.generate({
        sourceImage,
        audioUrl,
        preprocess: 'crop',
        stillMode: true,
        enhancer: 'gfpgan',
      }),
      PIPELINE_TIMEOUTS.avatarPerSlide,
      `SadTalker generation for slide ${slideId}`
    );

    if (result.success && result.videoUrl) {
      const localPath = await downloadToLocal(result.videoUrl, slideId);
      return {
        slideId,
        success: true,
        videoUrl: result.videoUrl,
        localVideoPath: localPath,
        provider: 'sadtalker',
      };
    }

    return {
      slideId,
      success: false,
      error: result.error || 'Both MuseTalk and SadTalker failed',
    };
  } catch (error) {
    return {
      slideId,
      success: false,
      error: error instanceof Error ? error.message : 'Avatar generation failed',
    };
  }
}

/**
 * Generate talking-head videos for multiple slides sequentially.
 * Sequential processing avoids rate-limit issues with external APIs.
 */
export async function generateForSlides(
  requests: TalkingHeadRequest[],
  onProgress?: ProgressCallback
): Promise<TalkingHeadResult[]> {
  logger.info('Starting batch talking head generation', {
    slideCount: requests.length,
  });

  const results: TalkingHeadResult[] = [];

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];

    onProgress?.(i, requests.length, request.slideId);

    const result = await generateSingle(request);
    results.push(result);

    if (!result.success) {
      logger.warn('Talking head generation failed for slide, continuing', {
        slideId: request.slideId,
        error: result.error,
      });
    }

    onProgress?.(i + 1, requests.length, request.slideId);
  }

  const successCount = results.filter((r) => r.success).length;
  logger.info('Batch talking head generation complete', {
    total: requests.length,
    succeeded: successCount,
    failed: requests.length - successCount,
  });

  return results;
}

export const TalkingHeadPipelineService = {
  generateForSlides,
  generateSingle,
  downloadToLocal,
};

export default TalkingHeadPipelineService;
