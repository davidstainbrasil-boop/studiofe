export interface LipSyncFrame {
  timestampMs: number;
  phoneme: string;
  intensity: number;
  jawOpen?: number;
  mouthClose?: number;
  mouthFunnel?: number;
  mouthPucker?: number;
  mouthLeft?: number;
  mouthRight?: number;
  mouthRollLower?: number;
  tongueOut?: number;
  mouthSmile?: number;
  mouthShrugUpper?: number;
}

export const audio2FaceService = {
  async createSession() {
    return 'mock-session';
  },
  async destroySession(sessionId: string) {
    return;
  },
  async processAudio(sessionId: string, audioBuffer: Buffer, options: any) {
    console.log('[Mock] Processing Audio2Face', { size: audioBuffer.length });
    return {
      success: true,
      lipSyncData: [] as LipSyncFrame[]
    };
  }
};
