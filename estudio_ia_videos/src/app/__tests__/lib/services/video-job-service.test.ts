import { updateVideoJobWatermark } from '@/lib/services/video-job-service';
import { prisma } from '@/lib/prisma';

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    render_jobs: {
      update: jest.fn(),
    },
  },
}));

describe('Video Job Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateVideoJobWatermark', () => {
    it('should update job with watermark settings', async () => {
      const jobId = 'job-123';
      const watermarkText = 'Confidential';

      (prisma.render_jobs.update as jest.Mock).mockResolvedValue({ id: jobId });

      await updateVideoJobWatermark(jobId, watermarkText);

      expect(prisma.render_jobs.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: {
          status: 'pending',
          renderSettings: {
            watermarkText,
          },
        },
      });
    });

    it('should throw error if update fails', async () => {
      const jobId = 'job-123';
      const watermarkText = 'Confidential';

      (prisma.render_jobs.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(updateVideoJobWatermark(jobId, watermarkText)).rejects.toThrow('Could not update video job with watermark.');
    });
  });
});
