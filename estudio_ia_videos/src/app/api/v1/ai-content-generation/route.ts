
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { isProduction } from '@lib/utils/mock-guard'
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';
import { GET as getV1AIContentGenerate, POST as postV1AIContentGenerate } from '@/app/api/v1/ai-content/generate/route';

function buildForwardHeaders(source: NextRequest): Headers {
  const headers = new Headers();
  const cookie = source.headers.get('cookie');
  const authorization = source.headers.get('authorization');
  const testUserId = source.headers.get('x-user-id');

  headers.set('content-type', 'application/json');
  if (cookie) headers.set('cookie', cookie);
  if (authorization) headers.set('authorization', authorization);
  if (testUserId) headers.set('x-user-id', testUserId);

  return headers;
}

export async function GET(request: NextRequest) {
  try {
    if (isProduction()) {
      const targetRequest = new NextRequest(new URL('/api/v1/ai-content/generate', request.url), {
        method: 'GET',
        headers: buildForwardHeaders(request),
      });

      const targetResponse = await getV1AIContentGenerate(targetRequest);
      const targetData = await targetResponse.json();

      if (!targetResponse.ok || !targetData?.success) {
        return NextResponse.json(
          { success: false, error: targetData?.error || 'Falha ao obter capacidades de IA' },
          { status: targetResponse.status || 500 }
        );
      }

      const models = Array.isArray(targetData.data?.models) ? targetData.data.models : [];
      const contentTypes = Array.isArray(targetData.data?.contentTypes) ? targetData.data.contentTypes : [];

      return NextResponse.json({
        success: true,
        data: {
          models,
          templates: contentTypes.map((item: { id: string; name: string; duration?: string }) => ({
            id: item.id,
            title: item.name,
            category: 'AI Content',
            nr_compliance: [],
            industry: [],
            complexity: 'intermediate',
            estimatedDuration: item.duration || 'N/A',
            ai_confidence: null
          })),
          system_status: {
            active_models: models.length,
            average_accuracy: null,
            total_templates: contentTypes.length
          }
        },
        capabilities: targetData.data,
        timestamp: new Date().toISOString()
      });
    }

    const aiModels = [
      {
        id: 'gpt-nr-specialist',
        name: 'GPT NR Specialist',
        type: 'text',
        accuracy: 97.8,
        speed: 'fast',
        specialty: ['NR-06', 'NR-10', 'NR-12', 'NR-33', 'NR-35'],
        status: 'active'
      },
      {
        id: 'video-gen-pro',
        name: 'Video Generator Pro',
        type: 'video',
        accuracy: 94.2,
        speed: 'medium',
        specialty: ['safety-scenarios', 'demonstrations', 'simulations'],
        status: 'active'
      },
      {
        id: 'voice-cloning-nr',
        name: 'Voice Cloning NR',
        type: 'audio',
        accuracy: 96.5,
        speed: 'fast',
        specialty: ['brazilian-portuguese', 'technical-terms', 'clear-diction'],
        status: 'active'
      }
    ]

    const templates = [
      {
        id: 'nr06-epi-intro',
        title: 'NR-06: Introdução aos EPIs',
        category: 'Equipamentos de Proteção',
        nr_compliance: ['NR-06'],
        industry: ['Construção', 'Indústria', 'Mineração'],
        complexity: 'basic',
        estimatedDuration: 8,
        ai_confidence: 98.7
      },
      {
        id: 'nr10-electrical-advanced',
        title: 'NR-10: Segurança em Instalações Elétricas Avançada',
        category: 'Segurança Elétrica',
        nr_compliance: ['NR-10'],
        industry: ['Energia', 'Indústria', 'Manutenção'],
        complexity: 'advanced',
        estimatedDuration: 25,
        ai_confidence: 96.4
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        models: aiModels,
        templates: templates,
        system_status: {
          active_models: aiModels.filter(m => m.status === 'active').length,
          average_accuracy: aiModels.reduce((acc, m) => acc + m.accuracy, 0) / aiModels.length,
          total_templates: templates.length
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error in AI content generation API', err, { component: 'API: v1/ai-content-generation' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(request, 'v1-ai-content', 10);
    if (blocked) return blocked;

    const body = await request.json()
    const { 
      contentType, 
      nrFocus, 
      industry, 
      complexity, 
      duration, 
      customPrompt 
    } = body

    if (isProduction()) {
      if (!contentType || !nrFocus || !industry) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const prompt = customPrompt || `Gerar conteúdo ${contentType} para ${nrFocus} no setor ${industry}`;
      const targetPayload = {
        prompt,
        options: {
          nrType: String(nrFocus),
          audience: String(industry),
          type: String(contentType),
          duration: typeof duration === 'number' ? duration : 10,
          includeQuiz: String(contentType).toLowerCase().includes('quiz'),
          includeImages: String(contentType).toLowerCase().includes('presentation') || String(contentType).toLowerCase().includes('slide'),
          complexity: complexity || 'intermediate'
        }
      };

      const targetRequest = new NextRequest(new URL('/api/v1/ai-content/generate', request.url), {
        method: 'POST',
        headers: buildForwardHeaders(request),
        body: JSON.stringify(targetPayload)
      });

      const targetResponse = await postV1AIContentGenerate(targetRequest);
      const targetData = await targetResponse.json();

      if (!targetResponse.ok || !targetData?.success) {
        return NextResponse.json(
          { success: false, error: targetData?.error || 'Falha na geração de conteúdo' },
          { status: targetResponse.status || 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Conteúdo gerado com sucesso',
        data: {
          id: `gen_${Date.now()}`,
          type: contentType,
          nr_focus: nrFocus,
          industry,
          complexity: complexity || 'intermediate',
          duration: duration || 10,
          customPrompt,
          status: 'completed',
          progress: 100,
          estimatedTime: 0,
          createdAt: new Date().toISOString(),
          output: targetData.data
        }
      });
    }

    // Validate required fields
    if (!contentType || !nrFocus || !industry) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Simulate content generation process
    const generationRequest = {
      id: `gen_${Date.now()}`,
      type: contentType,
      nr_focus: nrFocus,
      industry,
      complexity: complexity || 'intermediate',
      duration: duration || 5,
      customPrompt,
      status: 'processing',
      progress: 0,
      estimatedTime: duration * 60, // seconds
      createdAt: new Date().toISOString()
    }

    // REGRA DO REPO: mocks proibidos em producao
    // In a real implementation, this would trigger the actual AI generation
    if (!isProduction()) {
      setTimeout(() => {
        logger.info(`Generation ${generationRequest.id} completed`, {
          component: 'API: v1/ai-content-generation',
          generationId: generationRequest.id
        })
      }, generationRequest.estimatedTime * 1000)
    }

    return NextResponse.json({
      success: true,
      message: 'Geração de conteúdo iniciada',
      data: generationRequest
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error in AI content generation POST', err, { component: 'API: v1/ai-content-generation' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
