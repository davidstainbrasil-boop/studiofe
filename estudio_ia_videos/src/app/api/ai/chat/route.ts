/**
 * 🤖 AI Chat API
 * POST: Enviar mensagem para o assistente de IA
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

// ============================================================================
// Schemas
// ============================================================================

const chatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  projectId: z.string().uuid().optional(),
  context: z.object({
    tracks: z.number().optional(),
    clips: z.number().optional(),
    duration: z.number().optional(),
    currentTime: z.number().optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).max(20).optional(),
});

// ============================================================================
// POST - Chat with AI
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 chat requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`ai-chat:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      logger.warn('AI chat rate limit exceeded', { ip, retryAfter: rl.retryAfterSec });
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, projectId, context, history } = parsed.data;
    const supabase = createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check API key availability
    const openaiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiKey && !claudeKey) {
      // Return mock response in development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: getMockResponse(message),
          suggestions: getMockSuggestions(message),
        });
      }

      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 501 }
      );
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context);

    // Call AI service
    let response: string;
    let suggestions: AISuggestion[] = [];

    if (openaiKey) {
      const result = await callOpenAI(openaiKey, systemPrompt, message, history);
      response = result.message;
      suggestions = result.suggestions;
    } else if (claudeKey) {
      const result = await callClaude(claudeKey, systemPrompt, message, history);
      response = result.message;
      suggestions = result.suggestions;
    } else {
      response = getMockResponse(message);
      suggestions = getMockSuggestions(message);
    }

    logger.info('AI chat response generated', { 
      userId: user.id,
      projectId,
      messageLength: message.length,
    });

    return NextResponse.json({
      success: true,
      message: response,
      suggestions,
    });
  } catch (error) {
    logger.error('AI chat error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface AISuggestion {
  type: 'script' | 'edit' | 'effect' | 'music' | 'color' | 'visual' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function buildSystemPrompt(context?: { tracks?: number; clips?: number; duration?: number; currentTime?: number }) {
  let prompt = `Você é um assistente especializado em produção de vídeos técnicos para cursos de Normas Regulamentadoras (NR).

Suas principais funções:
- Ajudar na criação e edição de roteiros
- Sugerir melhorias na estrutura do vídeo
- Recomendar efeitos e transições apropriados
- Auxiliar na configuração de legendas e narração
- Otimizar o fluxo de produção do vídeo

Responda sempre em português brasileiro de forma clara e objetiva.`;

  if (context) {
    prompt += `\n\nContexto do projeto atual:`;
    if (context.tracks !== undefined) prompt += `\n- ${context.tracks} tracks na timeline`;
    if (context.clips !== undefined) prompt += `\n- ${context.clips} clips no projeto`;
    if (context.duration !== undefined) prompt += `\n- Duração: ${Math.round(context.duration / 60)} minutos`;
    if (context.currentTime !== undefined) prompt += `\n- Posição atual: ${Math.round(context.currentTime)}s`;
  }

  return prompt;
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  message: string,
  history?: ChatMessage[]
): Promise<{ message: string; suggestions: AISuggestion[] }> {
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...(history || []),
    { role: 'user' as const, content: message },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';

  return {
    message: content,
    suggestions: extractSuggestions(content),
  };
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  message: string,
  history?: ChatMessage[]
): Promise<{ message: string; suggestions: AISuggestion[] }> {
  const messages = [
    ...(history || []).map(m => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || '';

  return {
    message: content,
    suggestions: extractSuggestions(content),
  };
}

function extractSuggestions(content: string): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Simple heuristic to extract suggestions from response
  if (content.includes('sugest') || content.includes('recomend')) {
    if (content.includes('roteiro') || content.includes('script')) {
      suggestions.push({
        type: 'script',
        title: 'Melhoria de roteiro',
        description: 'Sugestão de edição no roteiro detectada',
        confidence: 0.7,
      });
    }
    if (content.includes('efeito') || content.includes('transição')) {
      suggestions.push({
        type: 'effect',
        title: 'Adicionar efeito',
        description: 'Sugestão de efeito visual detectada',
        confidence: 0.6,
      });
    }
    if (content.includes('cor') || content.includes('color')) {
      suggestions.push({
        type: 'color',
        title: 'Ajuste de cor',
        description: 'Sugestão de correção de cor detectada',
        confidence: 0.6,
      });
    }
  }

  return suggestions;
}

function getMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('roteiro') || lowerMessage.includes('script')) {
    return `Entendido! Para criar um roteiro eficaz para vídeos de NR, sugiro a seguinte estrutura:

1. **Introdução** (30s): Apresente o tema e sua importância
2. **Objetivos** (15s): Liste os pontos de aprendizado
3. **Conteúdo principal** (3-5min): Desenvolva os tópicos
4. **Exemplos práticos** (1-2min): Mostre casos reais
5. **Resumo** (30s): Recapitule os pontos principais
6. **Avaliação** (opcional): Quiz ou perguntas

Quer que eu desenvolva alguma dessas seções?`;
  }

  if (lowerMessage.includes('corte') || lowerMessage.includes('edição')) {
    return `Para edição profissional de vídeos técnicos, recomendo:

- **Cortes limpos**: Evite transições muito elaboradas em conteúdo técnico
- **Ritmo**: Mantenha clipes entre 5-15 segundos para manter atenção
- **B-roll**: Use imagens de apoio para ilustrar conceitos
- **Texto em tela**: Destaque termos técnicos importantes

Posso ajudar a identificar os melhores pontos de corte no seu vídeo atual.`;
  }

  if (lowerMessage.includes('legenda') || lowerMessage.includes('subtitle')) {
    return `Para legendas em vídeos técnicos:

- **Sincronização**: Use a ferramenta de auto-legendas do Studio
- **Formatação**: Fonte clara, tamanho adequado (18-24pt)
- **Posição**: Centralizado na parte inferior
- **Tempo**: Mínimo de 2 segundos por frase
- **Termos técnicos**: Revise a transcrição de siglas e termos específicos

Quer que eu gere legendas automáticas para o projeto?`;
  }

  return `Olá! Sou o assistente de IA do Studio.

Posso ajudar você com:
- 📝 Criação e melhoria de roteiros
- ✂️ Sugestões de cortes e edição
- 🎨 Recomendações de efeitos visuais
- 📊 Análise de conteúdo
- 📝 Geração de legendas

Como posso ajudar no seu projeto de vídeo?`;
}

function getMockSuggestions(message: string): AISuggestion[] {
  const lowerMessage = message.toLowerCase();
  const suggestions: AISuggestion[] = [];

  if (lowerMessage.includes('roteiro')) {
    suggestions.push({
      type: 'script',
      title: 'Gerar estrutura de roteiro',
      description: 'Criar estrutura profissional para vídeo NR',
      confidence: 0.85,
    });
  }

  if (lowerMessage.includes('melhora') || lowerMessage.includes('qualidade')) {
    suggestions.push({
      type: 'optimization',
      title: 'Otimizar vídeo',
      description: 'Aplicar melhorias automáticas de qualidade',
      confidence: 0.75,
    });
  }

  return suggestions;
}
