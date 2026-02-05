export interface RenderTaskPayload {
  /** Either videoExportId or jobId is required */
  videoExportId?: string;
  /** Either videoExportId or jobId is required */
  jobId?: string;
  projectId: string;
  userId?: string;
  type?: 'export' | 'render';
  sourceUrl?: string;
  exportSettings?: Record<string, unknown>;
  subtitleUrl?: string | null;
  priority?: number;
  slides?: RenderSlide[];
  config?: RenderConfig;
  settings?: RenderSettings;
  webhookUrl?: string;
  [key: string]: unknown;
}

export interface RenderSlide {
  id: string;
  orderIndex?: number;
  title?: string;
  content: string | object;
  duration?: number;
  transition?: string;
  transitionDuration?: number;
}

export interface RenderConfig {
  resolution?: string;
  fps?: number;
  quality?: string;
  format?: 'mp4' | 'webm' | 'mov';
  codec?: string;
  bitrate?: string;
  audioCodec?: string;
  audioBitrate?: string;
  test?: boolean;
  includeAudio?: boolean;
  includeSubtitles?: boolean;
}

export interface RenderSettings {
  resolution?: string;
  fps?: number;
  quality?: string;
  format?: string;
  includeAudio?: boolean;
  includeSubtitles?: boolean;
  avatarId?: string;
}

export interface RenderTaskResult {
  jobId: string;
  outputUrl?: string;
  metadata?: {
    completedAt: string;
    renderTime: number;
  };
}
