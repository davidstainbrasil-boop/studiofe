/**
 * API NR Templates - Lista templates de cursos NR do banco local
 * GET /api/templates/nr
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nrNumber = searchParams.get('nr');

    // Buscar templates do banco local
    let templates;
    
    if (nrNumber) {
      templates = await prisma.nrTemplate.findMany({
        where: { nrNumber: nrNumber },
        orderBy: { nrNumber: 'asc' },
      });
    } else {
      templates = await prisma.nrTemplate.findMany({
        orderBy: { nrNumber: 'asc' },
      });
    }

    // Formatar resposta
    const formattedTemplates = templates.map(t => ({
      id: t.id,
      nrNumber: t.nrNumber,
      title: t.title,
      description: t.description,
      slideCount: t.slideCount,
      durationSeconds: t.durationSeconds,
      durationFormatted: formatDuration(t.durationSeconds || 0),
      config: t.templateConfig,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      count: formattedTemplates.length,
      templates: formattedTemplates,
      source: 'local_database',
    });

  } catch (error) {
    console.error('[Templates NR] Erro:', error);
    
    // Fallback para templates estáticos
    return NextResponse.json({
      success: true,
      count: 7,
      templates: getStaticTemplates(),
      source: 'static_fallback',
    });
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minutos`;
}

function getStaticTemplates() {
  return [
    {
      id: 'nr-01',
      nrNumber: 'NR-01',
      title: 'Disposições Gerais e GRO',
      description: 'Gerenciamento de Riscos Ocupacionais',
      slideCount: 8,
      durationSeconds: 480,
      durationFormatted: '8 minutos',
    },
    {
      id: 'nr-05',
      nrNumber: 'NR-05',
      title: 'CIPA',
      description: 'Comissão Interna de Prevenção de Acidentes',
      slideCount: 7,
      durationSeconds: 420,
      durationFormatted: '7 minutos',
    },
    {
      id: 'nr-06',
      nrNumber: 'NR-06',
      title: 'EPIs',
      description: 'Equipamentos de Proteção Individual',
      slideCount: 10,
      durationSeconds: 600,
      durationFormatted: '10 minutos',
    },
    {
      id: 'nr-10',
      nrNumber: 'NR-10',
      title: 'Segurança em Eletricidade',
      description: 'Instalações e Serviços em Eletricidade',
      slideCount: 13,
      durationSeconds: 780,
      durationFormatted: '13 minutos',
    },
    {
      id: 'nr-12',
      nrNumber: 'NR-12',
      title: 'Máquinas e Equipamentos',
      description: 'Segurança no Trabalho em Máquinas',
      slideCount: 12,
      durationSeconds: 720,
      durationFormatted: '12 minutos',
    },
    {
      id: 'nr-17',
      nrNumber: 'NR-17',
      title: 'Ergonomia',
      description: 'Adaptação das Condições de Trabalho',
      slideCount: 8,
      durationSeconds: 480,
      durationFormatted: '8 minutos',
    },
    {
      id: 'nr-35',
      nrNumber: 'NR-35',
      title: 'Trabalho em Altura',
      description: 'Requisitos para Trabalho Acima de 2 metros',
      slideCount: 10,
      durationSeconds: 600,
      durationFormatted: '10 minutos',
    },
  ];
}

// POST - Gerar vídeo a partir de um template NR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, nrNumber, voice } = body;

    if (!templateId && !nrNumber) {
      return NextResponse.json(
        { success: false, error: 'templateId ou nrNumber é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar template
    let template;
    if (templateId) {
      template = await prisma.nrTemplate.findUnique({
        where: { id: templateId },
      });
    } else {
      template = await prisma.nrTemplate.findFirst({
        where: { nrNumber: nrNumber },
      });
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template não encontrado' },
        { status: 404 }
      );
    }

    // Preparar slides do template
    const config = template.templateConfig as { slides?: Array<{ title: string; content?: string; narration?: string }> };
    const slides = config?.slides || [];

    // Retornar dados para geração de vídeo
    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        nrNumber: template.nrNumber,
        title: template.title,
      },
      slides: slides.map((s, i) => ({
        id: `slide-${i + 1}`,
        title: s.title,
        content: s.content || s.title,
        narration: s.narration || `Slide ${i + 1}: ${s.title}`,
        duration: 5,
      })),
      generateVideoUrl: '/api/video/generate',
      instructions: 'Use os slides retornados para gerar o vídeo via POST /api/video/generate',
    });

  } catch (error) {
    console.error('[Templates NR] Erro no POST:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

