import { Slide } from '../types';

export const RenderService = {
  async renderVideo(projectId: string, slides: Slide[]) {
    console.log(`[Mock] Rendering video project ${projectId}`);
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      videoUrl: 'https://example.com/mock-render.mp4'
    };
  }
};
