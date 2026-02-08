/**
 * 📚 API NR Templates - Templates REAIS de cursos NR
 * GET /api/templates/nr - Lista templates com conteúdo técnico validado
 * POST /api/templates/nr - Cria projeto a partir de template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';
import { 
  NR_TEMPLATES, 
  getTemplateById, 
  getTemplateByNR,
  type NRTemplate 
} from '@/lib/templates/nr-templates-real';

interface TemplateListItem {
  id: string;
  nrNumber: string;
  title: string;
  description: string;
  category: string;
  slideCount: number;
  durationSeconds: number;
  durationFormatted: string;
  tags: string[];
  compliance: {
    version: string;
    lastUpdate: string;
    source: string;
  };
  slides?: NRTemplate['slides'];
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'templates-nr-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const { searchParams } = new URL(request.url);
    const nrNumber = searchParams.get('nr');
    const id = searchParams.get('id');
    const category = searchParams.get('category');
    const includeSlides = searchParams.get('includeSlides') === 'true';

    // Busca por ID específico
    if (id) {
      const template = getTemplateById(id);
      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Template não encontrado', code: 'TEMPLATE_NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json({ 
        success: true, 
        template: formatTemplate(template, true),
        source: 'real_templates'
      });
    }

    // Busca por NR específica
    if (nrNumber) {
      const template = getTemplateByNR(nrNumber);
      if (!template) {
        return NextResponse.json(
          { success: false, error: `Nenhum template encontrado para ${nrNumber}`, code: 'NR_NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json({ 
        success: true, 
        template: formatTemplate(template, includeSlides),
        source: 'real_templates'
      });
    }

    // Lista todos os templates REAIS
    let templates: TemplateListItem[] = NR_TEMPLATES.map(t => formatTemplate(t, includeSlides));

    // Filtro por categoria
    if (category) {
      templates = templates.filter(t => 
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Agrupa por categoria
    const byCategory = templates.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {} as Record<string, TemplateListItem[]>);

    // Lista de NRs disponíveis
    const availableNRs = [...new Set(templates.map(t => t.nrNumber))].sort();

    return NextResponse.json({
      success: true,
      count: templates.length,
      availableNRs,
      categories: Object.keys(byCategory),
      templates,
      byCategory,
      source: 'real_templates'
    });

  } catch (error) {
    logger.error('Erro ao buscar templates NR', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: templates/nr'
    });
    
    return NextResponse.json(
      { success: false, error: 'Erro ao listar templates', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

function formatTemplate(template: NRTemplate, includeSlides: boolean = false): TemplateListItem {
  const item: TemplateListItem = {
    id: template.id,
    nrNumber: template.nr,
    title: template.title,
    description: template.description,
    category: template.category,
    slideCount: template.slides.length,
    durationSeconds: template.duration * 60,
    durationFormatted: `${template.duration} minutos`,
    tags: template.tags,
    compliance: template.compliance
  };
  
  if (includeSlides) {
    item.slides = template.slides;
  }
  
  return item;
}

/**
 * POST - Cria projeto a partir de template NR
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateId, nrNumber, projectName, customizations, voice } = body;

    if (!templateId && !nrNumber) {
      return NextResponse.json(
        { success: false, error: 'templateId ou nrNumber é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar template REAL
    let template: NRTemplate | undefined;
    if (templateId) {
      template = getTemplateById(templateId);
    } else if (nrNumber) {
      template = getTemplateByNR(nrNumber);
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template não encontrado' },
        { status: 404 }
      );
    }

    // Criar projeto no banco
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        userId: user.id,
        name: projectName || `${template.nr} - ${template.title}`,
        description: template.description,
        type: 'template-nr',
        status: 'draft',
        metadata: {
          source: 'nr-template',
          templateId: template.id,
          templateNR: template.nr,
          compliance: template.compliance,
          estimatedDuration: template.duration,
          customizations: customizations || {},
          voice: voice || 'default'
        }
      })
      .select()
      .single();

    if (projectError) {
      logger.error('[Templates NR] Erro ao criar projeto', projectError, {
        component: 'API: templates/nr'
      });
      return NextResponse.json(
        { success: false, error: 'Erro ao criar projeto', details: projectError.message },
        { status: 500 }
      );
    }

    // Criar slides do template no banco
    const slidesData = template.slides.map((slide) => ({
      projectId: project.id,
      order_index: slide.order,
      title: applyCustomizations(slide.title, customizations),
      content: applyCustomizations(slide.content, customizations),
      duration: slide.duration || 30,
      avatar_config: {
        type: slide.type,
        imageKeywords: slide.imageKeywords,
        templateSlide: true,
        notes: slide.notes || ''
      },
      audio_config: {}
    }));

    const { data: slides, error: slidesError } = await supabase
      .from('slides')
      .insert(slidesData)
      .select();

    if (slidesError) {
      logger.error('[Templates NR] Erro ao criar slides', slidesError, {
        component: 'API: templates/nr'
      });
      // Rollback - deletar projeto
      await supabase.from('projects').delete().eq('id', project.id);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar slides', details: slidesError.message },
        { status: 500 }
      );
    }

    // Retornar dados para geração de vídeo
    return NextResponse.json({
      success: true,
      message: 'Projeto criado com sucesso a partir do template NR',
      project: {
        id: project.id,
        name: project.name,
        slideCount: slides?.length || 0,
      },
      template: {
        id: template.id,
        nrNumber: template.nr,
        title: template.title,
        compliance: template.compliance
      },
      slides: slides?.map((s, i) => ({
        id: s.id,
        order: s.order_index,
        title: s.title,
        content: s.content,
        narration: template.slides[i]?.content || s.title || '',
        duration: s.duration,
        type: template.slides[i]?.type || 'content'
      })),
      generateVideoUrl: '/api/render/start',
      instructions: 'Use o project.id retornado para gerar o vídeo via POST /api/render/start'
    });

  } catch (error) {
    logger.error('[Templates NR] Erro no POST', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: templates/nr'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * Aplica customizações no conteúdo (placeholders)
 */
function applyCustomizations(text: string, customizations?: Record<string, string>): string {
  if (!customizations || !text) return text;
  
  let result = text;
  
  // Substitui placeholders como {{EMPRESA}}, {{DATA}}, etc
  Object.entries(customizations).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{${key.toUpperCase()}\\}\\}`, 'g');
    result = result.replace(placeholder, value);
  });
  
  return result;
}

