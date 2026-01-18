/**
 * Ready Player Me Service - HIGH Quality Tier
 *
 * Integrates Ready Player Me avatars with Remotion rendering for high-quality avatar videos.
 * Uses BullMQ for async job processing.
 *
 * Flow:
 * 1. Validate RPM avatar URL
 * 2. Fetch GLB model metadata
 * 3. Generate blend shape animations from lip-sync
 * 4. Queue Remotion render job via BullMQ
 * 5. Track status and return video URL when complete
 */

import { logger } from '@/lib/logger';
import {
  AvatarGenerationParams,
  AvatarGenerationResult,
} from '@/lib/avatar/avatar-renderer-factory';
import { addVideoJob, getVideoJobStatus } from '@/lib/queue/render-queue';
import { prisma } from '@/lib/prisma';
import { BlendShapeFrame } from '@/lib/avatar/blend-shape-controller';

/**
 * Ready Player Me Service
 * Cost: 3 credits per render
 * Estimated time: ~120 seconds (2 minutes)
 */
export class ReadyPlayerMeService {
  /**
   * Validates a Ready Player Me avatar URL
   *
   * Valid formats:
   * - https://models.readyplayer.me/[avatarId].glb
   * - https://api.readyplayer.me/v2/avatars/[avatarId].glb
   *
   * @param url - Avatar URL to validate
   * @returns true if valid RPM URL
   */
  private validateRPMUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const isRPMDomain =
        parsed.hostname === 'models.readyplayer.me' || parsed.hostname === 'api.readyplayer.me';
      const hasGlbExtension = parsed.pathname.endsWith('.glb');

      return isRPMDomain && hasGlbExtension;
    } catch {
      return false;
    }
  }

  /**
   * Normalizes RPM URL to use the CDN domain (models.readyplayer.me)
   *
   * @param url - Original RPM URL
   * @returns Normalized CDN URL
   */
  private normalizeRPMUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Convert api.readyplayer.me to models.readyplayer.me
      if (parsed.hostname === 'api.readyplayer.me') {
        parsed.hostname = 'models.readyplayer.me';
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Fetches GLB metadata from Ready Player Me
   *
   * @param avatarUrl - RPM avatar URL
   * @returns Metadata about the GLB model
   */
  private async fetchGLBMetadata(avatarUrl: string): Promise<{
    url: string;
    size: number;
    contentType: string;
  }> {
    try {
      const response = await fetch(avatarUrl, { method: 'HEAD' });

      if (!response.ok) {
        throw new Error(`Failed to fetch GLB metadata: ${response.status} ${response.statusText}`);
      }

      const size = parseInt(response.headers.get('content-length') || '0', 10);
      const contentType = response.headers.get('content-type') || 'model/gltf-binary';

      logger.info('GLB metadata fetched', {
        component: 'ReadyPlayerMeService',
        avatarUrl,
        size,
        contentType,
      });

      return {
        url: avatarUrl,
        size,
        contentType,
      };
    } catch (error) {
      logger.error('Failed to fetch GLB metadata', {
        component: 'ReadyPlayerMeService',
        avatarUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Invalid Ready Player Me avatar URL or model not accessible');
    }
  }

  /**
   * Creates a video using Remotion + Ready Player Me Avatar
   *
   * This is the "HIGH Quality" tier which uses our own rendering pipeline (Remotion)
   * with high-quality settings and RPM 3D avatars.
   *
   * @param params - Avatar generation parameters
   * @returns Job ID for status tracking
   */
  async createVideo(params: AvatarGenerationParams): Promise<string> {
    try {
      logger.info('Creating Ready Player Me video', {
        component: 'ReadyPlayerMeService',
        userId: params.userId,
        hasAudio: !!params.audioUrl,
        hasText: !!params.text,
      });

      // 1. Validate RPM URL
      if (!params.sourceImageUrl) {
        throw new Error('sourceImageUrl (RPM avatar URL) is required');
      }

      if (!this.validateRPMUrl(params.sourceImageUrl)) {
        throw new Error(
          'Invalid Ready Player Me URL. Expected format: https://models.readyplayer.me/[avatarId].glb',
        );
      }

      // 2. Normalize URL to use CDN
      const normalizedUrl = this.normalizeRPMUrl(params.sourceImageUrl);

      // 3. Fetch and validate GLB model
      const glbMetadata = await this.fetchGLBMetadata(normalizedUrl);

      // 4. Validate required data for rendering
      if (!params.audioUrl && !params.text) {
        throw new Error('Either audioUrl or text is required for lip-sync animation');
      }

      // 5. Extract blend shape frames from metadata (if provided)
      // In real implementation, these come from FacialAnimationEngine
      const blendShapeFrames: BlendShapeFrame[] =
        (params.metadata?.blendShapeFrames as BlendShapeFrame[]) || [];

      if (blendShapeFrames.length === 0) {
        throw new Error(
          'Blend shape frames are required. Please generate facial animation first using FacialAnimationEngine.',
        );
      }

      // 6. Create job ID
      const jobId = `rpm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 7. Store job in database for tracking
      await prisma.video_jobs.create({
        data: {
          id: jobId,
          user_id: params.userId,
          status: 'pending',
          type: 'rpm-avatar-render',
          metadata: {
            avatarUrl: normalizedUrl,
            audioUrl: params.audioUrl,
            text: params.text,
            blendShapeFrames,
            glbMetadata,
            quality: params.quality,
            voiceId: params.voiceId,
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 8. Queue Remotion render job via BullMQ
      const bullmqJobId = await addVideoJob({
        jobId,
        userId: params.userId,
        type: 'rpm-avatar',
        composition: 'RPMAvatar',
        inputProps: {
          avatarUrl: normalizedUrl,
          audioUrl: params.audioUrl,
          blendShapeFrames,
          fps: 30,
          cameraPosition: [0, 1.6, 2],
          cameraTarget: [0, 1.6, 0],
          backgroundColor: '#f0f0f0',
        },
        priority: 5, // Higher priority for paid tier
      });

      logger.info('Ready Player Me render job queued', {
        component: 'ReadyPlayerMeService',
        jobId,
        bullmqJobId,
        userId: params.userId,
        blendShapeFrameCount: blendShapeFrames.length,
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to create Ready Player Me video', {
        component: 'ReadyPlayerMeService',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: params.userId,
      });

      throw error;
    }
  }

  /**
   * Gets the status of a Ready Player Me render job
   *
   * @param jobId - Job ID from createVideo()
   * @returns Job status and result
   */
  async getStatus(jobId: string): Promise<AvatarGenerationResult> {
    try {
      // 1. Get job from database
      const job = await prisma.video_jobs.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        logger.warn('Job not found', {
          component: 'ReadyPlayerMeService',
          jobId,
        });

        return {
          jobId,
          status: 'failed',
          error: 'Job not found',
          cost: 3,
        };
      }

      // 2. Get BullMQ job status
      const bullmqStatus = await getVideoJobStatus(jobId);

      // 3. Map BullMQ status to our status
      let status: 'pending' | 'processing' | 'completed' | 'failed';
      switch (bullmqStatus.status) {
        case 'waiting':
        case 'delayed':
          status = 'pending';
          break;
        case 'active':
          status = 'processing';
          break;
        case 'completed':
          status = 'completed';
          break;
        case 'failed':
        case 'error':
          status = 'failed';
          break;
        default:
          status = 'pending';
      }

      // 4. Get video URL from job result
      const metadata = job.metadata as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const videoUrl = metadata?.output_url || bullmqStatus.result?.outputUrl;

      logger.info('Ready Player Me job status', {
        component: 'ReadyPlayerMeService',
        jobId,
        status,
        progress: bullmqStatus.progress,
        hasVideoUrl: !!videoUrl,
      });

      return {
        jobId,
        status,
        videoUrl,
        error: bullmqStatus.error || (metadata?.error as string | undefined),
        cost: 3,
      };
    } catch (error) {
      logger.error('Failed to get Ready Player Me job status', {
        component: 'ReadyPlayerMeService',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        cost: 3,
      };
    }
  }
}
