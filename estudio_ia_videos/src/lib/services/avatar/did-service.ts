export const DIDService = {
  async createTalk(params: any) {
    return {
      id: `talk_${Date.now()}`,
      status: 'created',
      result_url: 'https://example.com/mock-avatar-video.mp4'
    };
  },
  async getTalk(id: string) {
    return {
      id,
      status: 'done',
      result_url: 'https://example.com/mock-avatar-video.mp4'
    };
  }
};
