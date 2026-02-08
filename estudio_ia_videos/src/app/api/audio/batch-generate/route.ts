
import { NextRequest, NextResponse } from 'next/server';
import { TTSService } from '@/lib/tts/tts-service';
import { logger } from '@/lib/monitoring/logger';
import { Scene } from '@/types/video-script';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';

interface BatchGenerateAudioRequest {
  scenes: Scene[];
  voiceId?: string;
}

interface SceneWithAudio extends Scene {
  audio: {
    url: string;
    duration: number;
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  logger.info('Recebida requisição para gerar áudio em lote.');

  try {
    const body = (await req.json()) as BatchGenerateAudioRequest;
    const { scenes, voiceId } = body;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'A propriedade "scenes" é obrigatória e deve ser um array não vazio.' }, { status: 400 });
    }

    const promises = scenes.map(async (scene) => {
      const ttsResult = await TTSService.synthesize({
        text: scene.narration,
        voiceId: voiceId || 'pt-BR-Neural2-A', // Voz padrão
      });
      return {
        ...scene,
        audio: {
          url: ttsResult.fileUrl,
          duration: ttsResult.duration,
        },
      };
    });

    const scenesWithAudio: SceneWithAudio[] = await Promise.all(promises);

    logger.info(`Áudio gerado com sucesso para ${scenesWithAudio.length} cenas.`);
    return NextResponse.json({ scenes: scenesWithAudio });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno no servidor.';
    logger.error('Erro ao manusear a requisição de geração de áudio em lote.', error as Error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
