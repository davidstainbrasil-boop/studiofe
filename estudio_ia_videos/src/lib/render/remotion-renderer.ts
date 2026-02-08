import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { jobManager } from './job-manager';
import { TimelineProject } from '@lib/types/timeline-types';
import { VideoUploader } from '@lib/storage/video-uploader';

export class RemotionRenderer {
  async renderJob(jobId: string, projectId: string): Promise<string> {
    try {
      logger.info('Starting Remotion render', { jobId, projectId });

      // 1. Fetch Project Data
      const project = await prisma.projects.findUnique({
        where: { id: projectId },
        select: { metadata: true, userId: true },
      });

      if (!project || !project.metadata || !project.userId) {
        throw new Error('Project not found or empty');
      }

      // Safe cast
      const metadata = project.metadata as Record<string, unknown>;
      const snapshot = metadata.studioSnapshot as TimelineProject;

      if (!snapshot) {
        throw new Error('Project snapshot not found');
      }

      // 2. Map Snapshot to Remotion Props
      const { mapProjectToRemotionProps } = await import('@lib/mappers/timeline-mapper');
      const inputProps = mapProjectToRemotionProps(snapshot) as unknown as Record<string, unknown>;

      // 3. Bundle Remotion (This might be slow, consider caching bundle in future)
      // Pointing to the Remotion Root component
      const entryPoint = path.join(process.cwd(), 'src', 'app', 'remotion', 'index.ts');

      logger.info('Bundling Remotion project...', { entryPoint });

      const bundled = await bundle({
        entryPoint,
        // Webpack config adjustments if needed
      });

      // 4. Select Composition
      const compositionId = 'TimelineVideo';
      const composition = await selectComposition({
        serveUrl: bundled,
        id: compositionId,
        inputProps,
      });

      // 5. Render to MP4
      const outputDir = path.join(os.tmpdir(), 'remotion-renders');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `${jobId}.mp4`;
      const outputPath = path.join(outputDir, fileName);

      logger.info('Rendering video...', {
        outputPath,
        durationInFrames: composition.durationInFrames,
      });

      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        onProgress: ({ progress }) => {
          // Update job progress (0-100)
          const p = Math.round(progress * 100);
          jobManager.updateProgress(jobId, p).catch((e) => logger.error(e, new Error(String(e))));
        },
      });

      logger.info('Render completed', { outputPath });

      // 6. Upload to Storage (real)
      const uploader = new VideoUploader();
      const outputUrl = await uploader.uploadVideo({
        videoPath: outputPath,
        projectId,
        userId: project.userId,
        jobId,
        metadata: {
          resolution: { width: composition.width, height: composition.height },
          fps: composition.fps,
          codec: 'h264',
          format: 'mp4',
          duration: composition.durationInFrames / composition.fps,
        },
      });

      // Cleanup local file
      try {
        await fs.promises.unlink(outputPath);
      } catch {
        // ignore
      }

      return outputUrl;
    } catch (error) {
      logger.error('Remotion render failed', error as Error);
      throw error;
    }
  }

  // Private mapper removed in favor of shared @lib/mappers/timeline-mapper
}

export const remotionRenderer = new RemotionRenderer();
