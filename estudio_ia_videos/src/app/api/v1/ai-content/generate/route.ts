import 'openai/shims/node';
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { AIContentService } from '@lib/services/ai-content.service'
import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(request, 'v1-ai-gen', 10);
    if (blocked) return blocked;

    const body = await request.json()
    const { prompt, options } = body
    
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt é obrigatório' },
        { status: 400 }
      )
    }

    logger.info('Generating AI content via AIContentService', { prompt, options });
    
    // Generate content with Real AI Service
    const aiService = AIContentService.getInstance();
    const generatedContent = await aiService.generateContent(prompt, options);
    
    return NextResponse.json({
      success: true,
      data: generatedContent,
      message: 'Conteúdo gerado com sucesso!'
    })
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); 
    logger.error('Error generating AI content', err, { component: 'API: v1/ai-content/generate' })
    return NextResponse.json(
      { success: false, error: 'Falha na geração de conteúdo: ' + err.message },
      { status: 500 }
    )
  }
}

// Get available AI models and capabilities
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        models: [
          { 
            id: 'gpt-4-turbo', 
            name: 'GPT-4 Turbo', 
            description: 'Modelo mais avançado para geração de conteúdo técnico',
            capabilities: ['text', 'quiz', 'slides'],
            accuracy: 98.7
          },
          { 
            id: 'gpt-4o', 
            name: 'GPT-4o', 
            description: 'Modelo otimizado para multimodalidade',
            capabilities: ['text', 'quiz', 'analysis'],
            accuracy: 99.0
          }
        ],
        supportedNRs: [
          { id: 'nr-12', name: 'NR-12 - Máquinas e Equipamentos', compliance: 99.1 },
          { id: 'nr-33', name: 'NR-33 - Espaços Confinados', compliance: 98.5 },
          { id: 'nr-35', name: 'NR-35 - Trabalho em Altura', compliance: 97.8 },
          { id: 'nr-06', name: 'NR-06 - Equipamentos de Proteção Individual', compliance: 98.9 },
          { id: 'nr-17', name: 'NR-17 - Ergonomia', compliance: 96.4 }
        ],
        contentTypes: [
          { id: 'script', name: 'Roteiro de Treinamento', duration: '15-60 min' },
          { id: 'presentation', name: 'Apresentação/Slides', duration: '10-45 min' },
          { id: 'quiz', name: 'Quiz Interativo', duration: '5-20 min' },
          { id: 'summary', name: 'Resumo Executivo', duration: '5-15 min' }
        ],
        languages: [
          { id: 'pt-br', name: 'Português (Brasil)', flag: '🇧🇷' },
          { id: 'en', name: 'English', flag: '🇺🇸' },
          { id: 'es', name: 'Español', flag: '🇪🇸' }
        ]
      }
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); 
    logger.error('Error fetching AI capabilities', err, { component: 'API: v1/ai-content/generate' })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI capabilities' },
      { status: 500 }
    )
  }
}
