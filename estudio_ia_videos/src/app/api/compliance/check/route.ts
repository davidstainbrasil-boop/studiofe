
/**
 * POST /api/compliance/check
 * Verifica conformidade de um projeto com uma NR específica
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@lib/auth'
import { prisma } from '@lib/db'
import { Prisma } from '@prisma/client'
import { checkCompliance, type NRCode } from '@lib/compliance/nr-engine'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { projectId, nr } = await req.json()

    if (!projectId || !nr) {
      return NextResponse.json(
        { error: 'projectId e nr são obrigatórios' },
        { status: 400 }
      )
    }

    // Busca projeto
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        slides: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Verifica permissão
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Define slide type for mapping
    interface ProjectSlide {
      orderIndex: number;
      title: string;
      content: string;
      duration?: number;
      backgroundImage?: string;
    }
    
    // Prepara conteúdo para análise
    const projectContent = {
      slides: (project.slides as unknown as ProjectSlide[]).map((slide) => ({
        number: slide.orderIndex,
        title: slide.title,
        content: slide.content,
        duration: slide.duration || 5,
        imageUrls: slide.backgroundImage ? [slide.backgroundImage] : [],
        audioPath: null // TODO: Extract from audioConfig if needed
      })),
      totalDuration: (project as { duration?: number }).duration || 0,
      imageUrls: (project.slides as unknown as ProjectSlide[]).map((slide) => slide.backgroundImage).filter(Boolean),
      audioFiles: []
    }

    // Executa análise de conformidade com IA
    const result = await checkCompliance(nr as NRCode, projectContent, true)

    // Salva resultado no banco
    // TODO: Se nr_compliance_records não existir no schema Prisma, usar Supabase diretamente ou criar migration
    interface NrComplianceModel {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    }
    let complianceRecord;
    try {
      complianceRecord = await (prisma as unknown as { nr_compliance_records: NrComplianceModel }).nr_compliance_records.create({
      data: {
        id: crypto.randomUUID(),

        projectId,
        nr: result.nr,
        nrName: result.nrName,
        status: result.status,
        score: result.score,
        finalScore: result.finalScore || result.score,
        requirementsMet: result.requirementsMet,
        requirementsTotal: result.requirementsTotal,
        validatedAt: new Date(),
        validatedBy: 'AI',
        recommendations: (result.recommendations || []) as unknown,
        criticalPoints: (result.criticalPoints || []) as unknown,
        aiAnalysis: (result.aiAnalysis || {}) as unknown,
        aiScore: result.aiScore,
        confidence: result.confidence
      }
    });
    } catch (dbError) {
      // Se tabela não existir, apenas logar e continuar sem salvar no banco
      logger.warn('Tabela nr_compliance_records não encontrada, pulando salvamento no banco', {
        component: 'API: compliance/check',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
      complianceRecord = { id: crypto.randomUUID() };
    }

    return NextResponse.json({
      success: true,
      recordId: complianceRecord.id,
      result
    })

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Erro ao verificar conformidade', err, { component: 'API: compliance/check' })
    return NextResponse.json(
      { error: 'Erro ao verificar conformidade' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'compliance-check-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório' },
        { status: 400 }
      )
    }

    // Busca registros de conformidade
    // TODO: Se nr_compliance_records não existir no schema Prisma, usar Supabase diretamente
    interface NrComplianceFindModel {
      findMany: (args: { where: Record<string, unknown>; orderBy: Record<string, string> }) => Promise<Array<Record<string, unknown>>>;
    }
    let records;
    try {
      records = await (prisma as unknown as { nr_compliance_records: NrComplianceFindModel }).nr_compliance_records.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
    } catch (dbError) {
      logger.warn('Tabela nr_compliance_records não encontrada, retornando lista vazia', {
        component: 'API: compliance/check',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
      records = [];
    }

    return NextResponse.json({ records })

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Erro ao buscar registros de conformidade', err, { component: 'API: compliance/check' });
    return NextResponse.json(
      { error: 'Erro ao buscar registros de conformidade' },
      { status: 500 }
    )
  }
}


