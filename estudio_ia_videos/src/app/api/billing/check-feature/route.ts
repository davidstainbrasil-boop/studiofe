/**
 * Feature Gate API
 * POST /api/billing/check-feature
 * 
 * Verifica se usuário tem acesso a uma feature específica
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { logger } from '@/lib/logger';
import { 
  checkFeatureAccess, 
  checkVideoLimit, 
  checkStorageLimit,
  type FeatureKey 
} from '@/lib/billing/feature-gate';

interface CheckFeatureRequest {
  userId: string;
  feature: FeatureKey | 'video_limit' | 'storage_limit';
  additionalBytes?: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json() as CheckFeatureRequest;
    const { userId, feature, additionalBytes } = body;

    if (!userId || !feature) {
      return NextResponse.json(
        { error: 'userId e feature são obrigatórios' },
        { status: 400 }
      );
    }

    let result;

    // Verificações especiais de limite
    if (feature === 'video_limit') {
      result = await checkVideoLimit(userId);
    } else if (feature === 'storage_limit') {
      result = await checkStorageLimit(userId, additionalBytes || 0);
    } else {
      result = await checkFeatureAccess(userId, feature as FeatureKey);
    }

    return NextResponse.json(result);

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Erro ao verificar feature access', err);
    return NextResponse.json(
      { error: 'Erro ao verificar acesso' },
      { status: 500 }
    );
  }
}
