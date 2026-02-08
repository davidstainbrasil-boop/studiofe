
/**
 * ✅ API: Resolve Comment
 * Resolver/reabrir comentário
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { commentsService } from '@lib/collab/comments-service';
import { logger } from '@lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { resolve, resolutionNote } = body;

    if (resolve) {
      await commentsService.resolveComment({
        commentId: params.commentId,
        userId: session.user.id,
        resolutionNote,
      });
    } else {
      await commentsService.reopenComment({
        commentId: params.commentId,
        userId: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('❌ Erro ao resolver/reabrir comentário:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: comments/[commentId]/resolve'
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao resolver/reabrir comentário' },
      { status: 500 }
    );
  }
}
