export interface RenderTaskPayload {
  videoExportId: string;
  projectId: string;
  [key: string]: unknown;
}

export interface RenderTaskResult {
  jobId: string;
  outputUrl?: string;
  metadata?: {
    completedAt: string;
    renderTime: number;
  };
}
