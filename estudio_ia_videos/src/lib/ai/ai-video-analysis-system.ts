/**
 * MOCK Implementation of AIVideoAnalysisSystem
 * Required for build validation where original file is missing.
 */
export class AIVideoAnalysisSystem {
  private static instance: AIVideoAnalysisSystem;
  
  private constructor() {}

  static getInstance(): AIVideoAnalysisSystem {
    if (!this.instance) {
      this.instance = new AIVideoAnalysisSystem();
    }
    return this.instance;
  }

  async analyzeVideo(videoId: string, videoPath: string, config?: Record<string, unknown>) {
    console.log('[Mock] Analyzing video:', videoId, videoPath);
    return {
      id: `analysis_${Date.now()}`,
      videoId,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString()
    };
  }

  getAnalysis(id: string) {
    return {
      id,
      videoId: 'mock_video_id',
      status: 'completed',
      progress: 100,
      results: { summary: 'Mock analysis result' },
      error: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
  }
}
