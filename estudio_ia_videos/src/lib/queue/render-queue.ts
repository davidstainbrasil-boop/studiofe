
import { Job } from 'bullmq';

export const createRenderQueueEvents = jest.fn((queueName: string = 'default') => ({
  on: jest.fn(),
  emit: jest.fn(),
  removeListener: jest.fn(),
  close: jest.fn(),
}));

export const addVideoJob = async (jobData: any) => {
  return 'mock-job-id';
};

export const getVideoJobStatus = async (jobId: string) => {
  return {
    id: jobId,
    status: 'completed',
    progress: 100,
    data: {},
    result: { output: 'mock-output.mp4' }
  };
};

export const VideoJobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};
