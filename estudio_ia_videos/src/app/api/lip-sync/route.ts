import { NextRequest, NextResponse } from 'next/server';
import { generateLipSyncVideo, validateLipSyncResources } from '@lib/services/lip-sync-integration';
import { logger } from '@lib/logger';
import { withPlanGuard } from '@/middleware/with-plan-guard';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/lip-sync
 * Gera vídeo com lip sync a partir de texto e avatar
 */
const handlePost = async (request: NextRequest) => {
  try {
    // Validação de recursos
    const validation = await validateLipSyncResources();
    if (!validation || !validation.valid) {
      logger.warn('Falha na validação de recursos de Lip Sync', { errors: validation.errors });
      return NextResponse.json(
        { error: 'Recursos não configurados' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, avatarImageUrl, voiceId, modelId, videoQuality, outputFileName } = body;

    if (!text || !avatarImageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: text, avatarImageUrl' },
        { status: 400 }
      );
    }

    const result = await generateLipSyncVideo({
      text,
      avatarImageUrl,
      voiceId,
      modelId,
      videoQuality,
      outputFileName
    });

    if (result.status === 'failed') {
      return NextResponse.json(
        { error: 'Falha ao gerar vídeo com lip sync' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao gerar lip sync', err, { component: 'API: lip-sync' });
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
};

export const POST = withPlanGuard(handlePost, {
  requiredPlan: 'pro',
  feature: 'lip_sync',
});

/**
 * GET /api/lip-sync/validate
 * Valida se os recursos necessários estão disponíveis
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'lip-sync-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const validation = await validateLipSyncResources();
    return NextResponse.json(validation);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao validar recursos', err, { component: 'API: lip-sync' });
    return NextResponse.json(
      { error: 'Erro ao validar recursos' },
      { status: 500 }
    );
  }
}

