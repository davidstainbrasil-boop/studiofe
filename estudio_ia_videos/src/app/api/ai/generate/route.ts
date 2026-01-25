import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { logger } from '@lib/logger';
import { mockDelay, isProduction, notImplementedResponse } from '@lib/utils/mock-guard';

// Mock response generator
const generateMockResponse = (prompt: string, type: string) => {
  const responses: Record<string, string> = {
    script: `Roteiro Gerado para: ${prompt}\n\n[CENA 1] INT. ESCRITÓRIO - DIA\n\nNARRADOR\nBem-vindos ao treinamento sobre ${prompt}. Hoje vamos aprender os conceitos fundamentais...\n\n[CENA 2] GRÁFICOS NA TELA\n\nMostra estatísticas de segurança...`,
    video: `https://mock-storage.com/videos/generated-${randomUUID()}.mp4`,
    image: `https://mock-storage.com/images/generated-${randomUUID()}.png`,
    quiz: JSON.stringify([
      { q: `Questão sobre ${prompt}?`, options: ['A', 'B', 'C'], correct: 'A' }
    ]),
    presentation: JSON.stringify({ slides: [`Slide 1: ${prompt}`, 'Slide 2: Introdução'] })
  };

  return responses[type] || `Conteúdo gerado para ${type}: ${prompt}`;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type, parameters } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // REGRA DO REPO: mocks proibidos em producao
    if (isProduction()) {
      return notImplementedResponse('ai-generate', 'AI content generation integration pending');
    }
    await mockDelay(2000, 'ai-generate');

    const result = {
      id: randomUUID(),
      content: generateMockResponse(prompt, type || 'script'),
      metadata: {
        tokens: Math.floor(prompt.length / 4),
        model: 'gpt-4-turbo-mock',
        processingTime: 2000
      },
      analysis: {
        quality: 85 + Math.random() * 15,
        engagement: 80 + Math.random() * 20,
        clarity: 90 + Math.random() * 10,
        compliance: 95 + Math.random() * 5
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Erro ao gerar conteúdo AI', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/generate'
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
