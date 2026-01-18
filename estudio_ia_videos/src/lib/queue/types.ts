export interface RenderTaskPayload {
  videoExportId: string;
  projectId: string;
  userId?: string;
  type?: 'export' | 'render';
  sourceUrl?: string;
  exportSettings?: Record<string, unknown>;
  subtitleUrl?: string | null;
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
