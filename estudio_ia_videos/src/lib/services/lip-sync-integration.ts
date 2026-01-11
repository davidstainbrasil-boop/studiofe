
export const LipSyncIntegration = {
  validateResources: async () => true,
  generateVideo: async () => ({ url: 'mock-url' })
};

export const validateLipSyncResources = async () => true;
export const generateLipSyncVideo = async (params: any) => ({ url: 'mock-url', status: 'completed' });
