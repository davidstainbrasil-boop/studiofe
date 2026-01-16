import { NextRequest, NextResponse } from 'next/server';
import { AIScriptGeneratorService } from '@lib/ai/script-generator.service';
import { logger } from '@lib/logger';

export async function POST(req: NextRequest) {
  try {
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
