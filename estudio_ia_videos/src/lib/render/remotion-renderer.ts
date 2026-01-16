
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { jobManager } from './job-manager';
import { TimelineProject } from '@lib/types/timeline-types';

export class RemotionRenderer {
  
  async renderJob(jobId: string, projectId: string): Promise<string> {
    try {
      logger.info('Starting Remotion render', { jobId, projectId });

      // 1. Fetch Project Data
      const project = await prisma.projects.findUnique({
        where: { id: projectId },
        select: { metadata: true }
      });

      if (!project || !project.metadata) {
        throw new Error('Project not found or empty');
      }

      // Safe cast
      const metadata = project.metadata as Record<string, any>;
      const snapshot = metadata.studioSnapshot as TimelineProject;

      if (!snapshot) {
        throw new Error('Project snapshot not found');
      }

      // 2. Map Snapshot to Remotion Props
      const { mapProjectToRemotionProps } = await import('@lib/mappers/timeline-mapper');
      const inputProps = mapProjectToRemotionProps(snapshot);

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
        inputProps: inputProps as any,
      });

      // 5. Render to MP4
      const outputDir = path.join(process.cwd(), 'public', 'renders');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const fileName = `${jobId}.mp4`;
      const outputPath = path.join(outputDir, fileName);

      logger.info('Rendering video...', { outputPath, durationInFrames: composition.durationInFrames });

      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: inputProps as any,
        onProgress: ({ progress }) => {
          // Update job progress (0-100)
          const p = Math.round(progress * 100);
          jobManager.updateProgress(jobId, p).catch(e => console.error(e));
        }
      });

      logger.info('Render completed', { outputPath });

      // 6. Upload to Storage (Optional, for now returning local public URL)
      // In production, we would upload to S3/Supabase Storage here.
      // For MVP, we serve from /renders/
      
      const publicUrl = `/renders/${fileName}`;
      return publicUrl;

    } catch (error) {
      logger.error('Remotion render failed', error as Error);
      throw error;
    }
  }

  // Private mapper removed in favor of shared @lib/mappers/timeline-mapper
}

export const remotionRenderer = new RemotionRenderer();
