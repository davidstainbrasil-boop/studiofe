
/**
 * 👍 API: Comment Reactions
 * Adicionar reações a comentários
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { commentsService } from '@lib/collab/comments-service';
import { logger } from '@lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ error: 'emoji é obrigatório' }, { status: 400 });
    }

    await commentsService.addReaction({
      commentId: params.commentId,
      user_id: session.user.id,
      emoji,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('❌ Erro ao adicionar reação:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: comments/[commentId]/reaction'
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao adicionar reação' },
      { status: 500 }
    );
  }
}
