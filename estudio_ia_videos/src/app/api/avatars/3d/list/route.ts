
/**
 * 📋 API: List Available 3D Avatars
 * Lista todos os avatares 3D disponíveis
 */

import { NextResponse , NextRequest } from 'next/server';
import { avatarEngine } from '@lib/avatar-engine';
import avatarsData from '@/data/avatars.json';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'avatars-3d-list-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const avatars = avatarEngine.getAllAvatars();

    return NextResponse.json({
      success: true,
      avatars: avatarsData,
      blendShapes: [],
      gestures: [],
      backgrounds: [],
      count: avatarsData.length
    });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao listar avatares', errorObj, { component: 'API: avatars/3d/list' });
    return NextResponse.json(
      { error: 'Erro ao listar avatares 3D' },
      { status: 500 }
    );
  }
}

