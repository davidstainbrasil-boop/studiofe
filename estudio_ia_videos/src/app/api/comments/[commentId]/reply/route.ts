
/**
 * 💬 API: Reply to Comment
 * Responder comentário
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
    const { content, mentions } = body;

    if (!content) {
      return NextResponse.json({ error: 'content é obrigatório' }, { status: 400 });
    }

    const reply = await commentsService.replyToComment({
      commentId: params.commentId,
      userId: session.user.id,
      content,
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    logger.error('❌ Erro ao responder comentário:', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: comments/[commentId]/reply'
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao responder comentário' },
      { status: 500 }
    );
  }
}
