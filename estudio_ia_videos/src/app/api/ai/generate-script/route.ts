import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { AIScriptGeneratorService } from '@lib/ai/script-generator.service';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(req, 'ai-script', 10);
    if (blocked) return blocked;

    const body = await req.json();
    const { nr, topics, duration, audience, company_context } = body;

    // Validate input
    if (!nr || !topics || !Array.isArray(topics)) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    // Call Service (Handles Real vs Mock internally)
    const script = await AIScriptGeneratorService.generate({
      nr,
      topics,
      duration: duration || 10,
      audience: audience || 'geral',
      company_context
    });

    return NextResponse.json({
      success: true,
      data: script
    });

  } catch (error) {
    logger.error('Erro na geração de roteiro AI', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/generate-script'
    });
    return NextResponse.json(
      { success: false, error: 'Falha na geração do roteiro' },
      { status: 500 }
    );
  }
}
