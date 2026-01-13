import fs from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { uploadFileToS3 } from '@lib/aws-s3-config';
import { logger } from '@/lib/services/logger-service';
import { Slide } from '@lib/types';

const getComposition = async (bundlePath: string) => {
  return await selectComposition({
    serveUrl: bundlePath,
    id: 'MyVideo', // Assuming a default composition ID
  });
};

export const RenderService = {
  async renderVideo(projectId: string, slides: Slide[]): Promise<{ success: boolean; videoUrl?: string; s3Key?: string; error?: string }> {
    logger.info(`Starting video render for project: ${projectId}`);
    const entry = 'src/remotion/index.ts'; // Assuming entry point
    const outputLocation = `out/${projectId}.mp4`;

    try {
      const bundlePath = await bundle(path.resolve(entry), () => undefined, {
        webpackOverride: (config) => config,
      });

      const composition = await getComposition(bundlePath);

      await renderMedia({
        composition,
        serveUrl: bundlePath,
        codec: 'h264',
        outputLocation,
        inputProps: { slides },
      });

      logger.info(`Render finished. Uploading to S3...`);

      const videoBuffer = fs.readFileSync(outputLocation);
      const { url, key } = await uploadFileToS3(videoBuffer, `renders/${projectId}.mp4`, 'video/mp4');

      logger.info(`Upload complete. Video URL: ${url}`);

      return {
        success: true,
        videoUrl: url,
        s3Key: key,
      };
    } catch (err) {
      const error = err as Error;
      logger.error(`Render failed for project ${projectId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
};
