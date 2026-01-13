

import { Scene } from '@/types/video-script';
import { NextRequest } from 'next/server';

describe('API Route: /api/audio/batch-generate', () => {
  let mockSynthesize: jest.Mock;
  let POST: any;

  beforeAll(() => {
    jest.doMock('@/lib/tts/tts-service', () => ({
      TTSService: {
        synthesize: jest.fn(),
      },
    }));

    jest.doMock('@/lib/logger', () => ({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
      },
    }));

    // Importar dinamicamente após os mocks
    const route = require('@/app/api/audio/batch-generate/route');
    const ttsService = require('@/lib/tts/tts-service');
    
    POST = route.POST;
    mockSynthesize = ttsService.TTSService.synthesize;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 400 se "scenes" não for fornecido ou estiver vazio', async () => {
    const scenarios = [
      {},
      { scenes: [] },
      { scenes: null },
      { otherProp: 'value' },
    ];

    for (const body of scenarios) {
      const req = {
        json: async () => Promise.resolve(body),
      } as unknown as NextRequest;

      const response = await POST(req);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('A propriedade "scenes" é obrigatória e deve ser um array não vazio.');
    }
  });

  it('deve gerar áudio para cada cena e retornar as cenas com URLs de áudio', async () => {
    const scenes: Scene[] = [
      { id: '1', narration: 'Narração da cena 1', image: { url: 'url1' } },
      { id: '2', narration: 'Narração da cena 2', image: { url: 'url2' } },
    ];

    mockSynthesize
      .mockResolvedValueOnce({ fileUrl: 'http://audio.url/1.mp3', duration: 5 })
      .mockResolvedValueOnce({ fileUrl: 'http://audio.url/2.mp3', duration: 10 });

    const req = {
      json: async () => Promise.resolve({ scenes, voiceId: 'test-voice' }),
    } as unknown as NextRequest;

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(mockSynthesize).toHaveBeenCalledTimes(2);
    expect(mockSynthesize).toHaveBeenCalledWith({
      text: 'Narração da cena 1',
      voiceId: 'test-voice',
    });
    expect(mockSynthesize).toHaveBeenCalledWith({
      text: 'Narração da cena 2',
      voiceId: 'test-voice',
    });
    expect(responseBody.scenes).toEqual([
      { ...scenes[0], audio: { url: 'http://audio.url/1.mp3', duration: 5 } },
      { ...scenes[1], audio: { url: 'http://audio.url/2.mp3', duration: 10 } },
    ]);
  });

  it('deve usar a voiceId padrão se nenhuma for fornecida', async () => {
    const scenes: Scene[] = [
      { id: '1', narration: 'Narração da cena 1', image: { url: 'url1' } },
    ];

    mockSynthesize.mockResolvedValueOnce({ fileUrl: 'http://audio.url/1.mp3', duration: 5 });

    const req = {
      json: async () => Promise.resolve({ scenes }),
    } as unknown as NextRequest;

    await POST(req);

    expect(mockSynthesize).toHaveBeenCalledWith({
      text: 'Narração da cena 1',
      voiceId: 'pt-BR-Neural2-A',
    });
  });

  it('deve retornar 500 se o serviço TTS falhar', async () => {
    const scenes: Scene[] = [
      { id: '1', narration: 'Narração da cena 1', image: { url: 'url1' } },
    ];
    const error = new Error('TTS service failed');
    mockSynthesize.mockRejectedValue(error);

    const req = {
      json: async () => Promise.resolve({ scenes }),
    } as unknown as NextRequest;

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    console.log('Actual error message:', responseBody.error);
    expect(responseBody.error).toBe('TTS service failed');
  });
});
