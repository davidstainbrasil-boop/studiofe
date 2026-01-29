import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function updateVideoJobWatermark(
  jobId: string,
  watermarkText: string
): Promise<void> {
  try {
    await prisma.render_jobs.update({
      where: {
        id: jobId,
      },
      data: {
        status: 'pending',
        renderSettings: {
          watermarkText
        },
      },
    });
    logger.info(`Updated watermark for job ${jobId}`, { watermarkText });
  } catch (error) {
    logger.error(`Error updating watermark for job ${jobId}:`, error as Error);
    throw new Error('Could not update video job with watermark.');
  }
}
