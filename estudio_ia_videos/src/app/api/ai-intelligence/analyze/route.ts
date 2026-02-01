
import 'openai/shims/node';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';
import { AIContentService } from '@lib/services/ai-content.service';

export async function POST(request: NextRequest) {
  try {
    const { projectId, analysisType = 'full', options = {} } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch real project data
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Buscar relações separadamente (Prisma não tem todas as relações configuradas)
    const [slides, scenes, transcriptions] = await Promise.all([
      prisma.slides.findMany({ where: { projectId }, take: 10 }),
      prisma.scenes.findMany({ where: { projectId }, take: 10 }),
      prisma.transcriptions.findMany({ where: { projectId }, take: 5 }),
    ]);

    logger.info('Analyzing project via AIContentService', { projectId, analysisType });

    // Analyze with Real AI Service
    const aiService = AIContentService.getInstance();
    
    // Prepare context for AI (sanitize/minimize data if needed)
    const projectContext = {
      name: project.name,
      description: project.description,
      type: project.type,
      scenesCount: scenes.length,
      slidesCount: slides.length,
      // Sample of content for analysis
      slidesContent: slides.slice(0, 5).map((s: { title: string | null; content: unknown }) => ({ title: s.title, content: s.content })),
      scenesScript: scenes.slice(0, 5).map((s: { name: string; avatarScript: string | null }) => ({ name: s.name, script: s.avatarScript })),
      metadata: project.metadata
    };

    const analysisResults = await aiService.analyzeProject(projectId, projectContext);

    // Persist the analysis result
    await prisma.analytics_events.create({
      data: {
        eventType: 'project_analysis_completed',
        userId: project.userId,
        eventData: JSON.parse(JSON.stringify({
          projectId,
          analysisType,
          result: analysisResults
        }))
      }
    });

    return NextResponse.json({
      success: true,
      analysis: analysisResults,
      processingTime: 'Real-time',
      message: 'Análise de IA concluída com sucesso'
    });

  } catch (error) {
    logger.error('Error in AI analysis', error instanceof Error ? error : new Error(String(error))
    , { component: 'API: ai-intelligence/analyze' });
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch historical analysis from DB
    const events = await prisma.analytics_events.findMany({
      where: {
        eventType: 'project_analysis_completed',
        eventData: {
          path: ['projectId'],
          equals: projectId
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const previousAnalyses = events.map(event => {
      const data = event.eventData as any;
      return {
        id: event.id,
        projectId,
        type: data.analysisType || 'full',
        completedAt: event.createdAt,
        overallScore: data.result?.overallScore || 0,
        confidence: data.result?.confidence || 0,
        status: 'completed'
      };
    });

    return NextResponse.json({
      success: true,
      analyses: previousAnalyses,
      totalAnalyses: previousAnalyses.length,
      lastAnalysis: previousAnalyses[0] || null
    });

  } catch (error) {
    logger.error('Error fetching AI analyses', error instanceof Error ? error : new Error(String(error))
    , { component: 'API: ai-intelligence/analyze' });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
