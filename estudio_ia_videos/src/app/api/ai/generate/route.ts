import 'openai/shims/node';
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@lib/auth/unified-session';
import { randomUUID } from 'crypto';
import { logger } from '@lib/logger';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/rate-limit';

// POST - AI Generate (Implementação Real)
export async function POST(req: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    // Rate limit: 10 AI requests per minute per IP (CRITICAL - costs money)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`ai-generate:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      logger.warn('AI generate rate limit exceeded', { ip, retryAfter: rl.retryAfterSec });
      return NextResponse.json(
        { error: 'Too many AI requests', retryAfter: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const { prompt, type, parameters } = body as {
      prompt?: string;
      type?: 'script' | 'quiz' | 'image' | 'video' | string;
      parameters?: Record<string, unknown>;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      logger.warn('Tentativa de geração de IA sem OPENAI_API_KEY', { component: 'API: ai/generate' });
      return NextResponse.json(
        { 
          error: 'Serviço de IA não configurado (API Key ausente).',
          code: 'MISSING_PROVIDER_CONFIG'
        },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const model = typeof parameters?.model === 'string' ? parameters.model : 'gpt-4o-mini';
    const generationType = type || 'text';

    let content: unknown = null;
    let providerUsage: Record<string, unknown> = {};

    const startTime = Date.now();

    if (generationType === 'script') {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Você é um especialista em roteiros de vídeo educacionais e técnicos. Crie um roteiro detalhado, separado por cenas, com falas para narrador e descrições visuais.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      });
      content = completion.choices[0]?.message?.content || '';
      providerUsage = {
        finishReason: completion.choices[0]?.finish_reason || null,
        usage: completion.usage || null
      };
    } else if (generationType === 'quiz') {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Crie um quiz em JSON com a chave "questions", cada item contendo "question", "options" (array), "correct" e "explanation".'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5
      });

      const jsonContent = completion.choices[0]?.message?.content || '{}';
      content = JSON.parse(jsonContent);
      providerUsage = {
        finishReason: completion.choices[0]?.finish_reason || null,
        usage: completion.usage || null
      };
    } else if (generationType === 'image') {
      const imageModel =
        typeof parameters?.model === 'string'
          ? parameters.model
          : process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
      const size =
        typeof parameters?.size === 'string' ? parameters.size : '1024x1024';
      const quality =
        typeof parameters?.quality === 'string' ? parameters.quality : 'auto';

      const imageResult = await openai.images.generate({
        model: imageModel,
        prompt,
        size: size as '1024x1024' | '1024x1536' | '1536x1024' | 'auto',
        quality: quality as 'high' | 'medium' | 'low' | 'auto'
      });

      const firstImage = imageResult.data?.[0];
      if (!firstImage) {
        throw new Error('OpenAI did not return image data');
      }

      content = {
        imageUrl: firstImage.url || null,
        b64Json: firstImage.b64_json || null
      };
      providerUsage = {
        model: imageModel,
        revisedPrompt: firstImage.revised_prompt || null
      };
    } else if (generationType === 'video') {
      return NextResponse.json(
        {
          error: 'Tipo de geração não suportado neste endpoint',
          code: 'UNSUPPORTED_GENERATION_TYPE',
          supportedTypes: ['script', 'quiz', 'image', 'text']
        },
        { status: 422 }
      );
    } else {
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }]
      });
      content = completion.choices[0]?.message?.content || '';
      providerUsage = {
        finishReason: completion.choices[0]?.finish_reason || null,
        usage: completion.usage || null
      };
    }

    const result = {
      id: randomUUID(),
      type: generationType,
      content,
      metadata: {
        model,
        processingTime: Date.now() - startTime
      },
      providerUsage
    };

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Erro ao gerar conteúdo AI', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: ai/generate'
    });
    
    const providerError = error as { status?: number; message?: string };
    if (providerError.status) {
      const mappedStatus = providerError.status >= 500 ? 502 : providerError.status;
      return NextResponse.json(
        { error: `Erro no provedor de IA: ${providerError.message || 'unknown error'}` },
        { status: mappedStatus }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
