// TODO: Fix NRTemplate type mapping

import { NextRequest, NextResponse } from 'next/server'
import { listNRTemplates, NRTemplate as ServiceNRTemplate } from '@lib/services/nr-templates-service'
import { logger } from '@lib/logger'
import { AIScriptGeneratorService } from '@lib/ai/script-generator.service'
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

interface NRTemplate {
  id: string
  name: string
  norma: string
  description: string
  category: 'seguranca' | 'saude' | 'meio-ambiente' | 'qualidade'
  industry: string[]
  duration: string
  slides: number
  compliance: number
  thumbnail: string
  features: string[]
  lastUpdated: string
  downloads: number
  rating: number
  isNew?: boolean
  isPremium?: boolean
  aiOptimized: boolean
  content?: unknown
}

/**
 * Converte template do banco (nr_templates) para formato de API v1
 */
function convertToV1Format(dbTemplate: ServiceNRTemplate): NRTemplate {
  const title = String(dbTemplate.title || '');
  const nrNumber = String(dbTemplate.nr_code || dbTemplate.nrNumber || '');
  const description = String(dbTemplate.description || '');
  const durationSeconds = Number(dbTemplate.durationSeconds || 0);
  const slideCount = Number(dbTemplate.slideCount || 0);
  const updatedAt = String(dbTemplate.createdAt || new Date().toISOString());

  return {
    id: String(dbTemplate.id),
    name: title,
    norma: nrNumber,
    description: description,
    category: 'seguranca', // Padrão, pode ser inferido futuramente
    industry: ['Geral'], // Pode ser expandido no banco
    duration: `${Math.floor(durationSeconds / 60)} min`,
    slides: slideCount,
    compliance: 100, // Pode ser calculado ou armazenado
    thumbnail: `/nr-thumbnails/${nrNumber.toLowerCase()}.jpg`,
    features: [
      'Conteúdo atualizado',
      'Conforme legislação vigente',
      'Exemplos práticos',
      'Quiz de avaliação'
    ],
    lastUpdated: new Date(updatedAt).toISOString().split('T')[0],
    downloads: 0, // Pode ser rastreado futuramente
    rating: 4.8,
    isNew: false,
    isPremium: false,
    aiOptimized: true
  };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-templates-nr-smart-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const norma = searchParams.get('norma')
    const aiOnly = searchParams.get('ai') === 'true'
    const search = searchParams.get('search')
    
    // Busca templates reais do banco de dados
    const dbTemplates = await listNRTemplates()
    let filteredTemplates = dbTemplates.map(convertToV1Format)
    
    // Filtros
    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.category === category)
    }
    
    if (norma && norma !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.norma === norma)
    }
    
    if (aiOnly) {
      filteredTemplates = filteredTemplates.filter(t => t.aiOptimized)
    }
    
    if (search) {
      filteredTemplates = filteredTemplates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.norma.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    return NextResponse.json({
      success: true,
      templates: filteredTemplates,
      total: filteredTemplates.length,
      filters: {
        category,
        norma,
        aiOnly,
        search
      }
    })
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Templates API Error', err, { component: 'API: v1/templates/nr-smart' })
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch templates'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await request.json()
    
    // Gerar template personalizado com IA
    if (body.action === 'generate') {
      const norma = body.norma || 'NR-23';
      const industry = body.industry || ['Geral'];
      
      let generatedScript;
      let isAiGenerated = false;

      // Tenta usar o serviço de IA Real
      try {
        if (process.env.OPENAI_API_KEY) {
            generatedScript = await AIScriptGeneratorService.generate({
                nr: norma,
                topics: body.topics || ['Introdução', 'Riscos', 'Medidas de Controle', 'Emergências'],
                duration: body.duration ? parseInt(body.duration) : 30,
                audience: body.audience || 'Trabalhadores',
                company_context: `Indústria: ${industry.join(', ')}`
            });
            isAiGenerated = true;
        } else {
            logger.warn('OPENAI_API_KEY not found, using algorithmic fallback', { component: 'API: v1/templates/nr-smart' });
        }
      } catch (aiError) {
        logger.error('AI Generation failed, falling back to algorithmic generation', aiError as Error, { component: 'API: v1/templates/nr-smart' });
      }

      // Fallback Algorítmico (Determinístico)
      // Cria um template baseado em regras se a IA falhar ou não estiver configurada
      if (!generatedScript) {
        generatedScript = {
            title: `Treinamento ${norma} - Segurança do Trabalho`,
            total_duration: 30,
            compliance_notes: ['Baseado na norma regulamentadora vigente'],
            engagement_tips: ['Faça perguntas ao público'],
            scenes: [
                {
                    id: 'intro',
                    title: 'Introdução à Norma',
                    duration: 5,
                    content: `Bem-vindos ao treinamento da ${norma}. O objetivo é garantir a segurança e saúde no trabalho.`,
                    avatar_instructions: 'Tom profissional e acolhedor',
                    visual_cues: ['Logo da empresa', 'Título da Norma'],
                    safety_highlights: ['Conceitos básicos']
                },
                {
                    id: 'risks',
                    title: 'Principais Riscos',
                    duration: 10,
                    content: 'Vamos identificar os principais riscos associados às atividades.',
                    avatar_instructions: 'Tom sério e alerta',
                    visual_cues: ['Ícones de perigo', 'Fotos de situações de risco'],
                    safety_highlights: ['Identificação de perigos']
                },
                {
                    id: 'measures',
                    title: 'Medidas de Prevenção',
                    duration: 10,
                    content: 'Conheça as medidas de controle coletivo e individual (EPIs).',
                    avatar_instructions: 'Tom instrutivo',
                    visual_cues: ['Exemplos de EPIs', 'EPCs'],
                    safety_highlights: ['Uso correto de equipamentos']
                },
                {
                    id: 'conclusion',
                    title: 'Conclusão',
                    duration: 5,
                    content: 'A segurança é responsabilidade de todos. Dúvidas?',
                    avatar_instructions: 'Tom motivador',
                    visual_cues: ['Resumo dos pontos', 'Contatos de emergência'],
                    safety_highlights: ['Cultura de segurança']
                }
            ]
        };
      }
      
      const customTemplate: NRTemplate = {
        id: 'gen-' + Date.now(),
        name: generatedScript.title,
        norma: norma,
        description: isAiGenerated ? 'Template gerado via IA avançada com base nos seus parâmetros.' : 'Template gerado com base nas diretrizes padrão da norma.',
        category: body.category || 'seguranca',
        industry: industry,
        duration: `${generatedScript.total_duration} min`,
        slides: generatedScript.scenes.length,
        compliance: isAiGenerated ? 99 : 90, // IA tende a ser mais específica
        thumbnail: `/nr-thumbnails/${norma.toLowerCase().replace('-', '')}.jpg`,
        features: [
          'Roteiro estruturado',
          'Destaques de segurança',
          'Instruções para avatar',
          'Foco em compliance'
        ],
        lastUpdated: new Date().toISOString().split('T')[0],
        downloads: 0,
        rating: 0,
        isNew: true,
        isPremium: false,
        aiOptimized: isAiGenerated,
        content: generatedScript // Retorna o script completo no objeto para uso imediato
      }
      
      return NextResponse.json({
        success: true,
        template: customTemplate,
        message: isAiGenerated ? 'Template gerado com IA com sucesso!' : 'Template padrão gerado com sucesso (IA indisponível).'
      })
    }
    
    // Download template
    if (body.action === 'download') {
      // Busca template real do banco
      const dbTemplates = await listNRTemplates()
      const dbTemplate = dbTemplates.find(t => t.id === body.templateId)
      
      if (dbTemplate) {
        const template = convertToV1Format(dbTemplate)
        
        return NextResponse.json({
          success: true,
          template,
          downloadUrl: `/api/v1/templates/nr-smart/${body.templateId}/download`,
          message: 'Template baixado com sucesso!'
        })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Templates POST Error', err, { component: 'API: v1/templates/nr-smart' })
    return NextResponse.json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 })
  }
}
