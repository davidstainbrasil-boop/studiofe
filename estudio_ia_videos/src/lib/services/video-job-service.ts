import { prisma } from '@/lib/prisma';

export async function updateVideoJobWatermark(
  jobId: string,
  watermarkText: string
): Promise<void> {
  try {
    await prisma.videoJob.update({
      where: {
        id: jobId,
      },
      data: {
        watermark: watermarkText,
        status: 'PENDING', 
      },
    });
  } catch (error) {
    console.error(`Error updating watermark for job ${jobId}:`, error);
    throw new Error('Could not update video job with watermark.');
  }
}
