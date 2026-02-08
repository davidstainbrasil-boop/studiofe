/**
 * API Subtitles Generate - Gera legendas SRT/VTT
 * POST /api/subtitles/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { SRTGenerator } from '@lib/subtitles/srt-generator';
import { z } from 'zod';
import { logger } from '@lib/logger';
import { getServerSession } from 'next-auth';

const slideSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  duration: z.number().min(1).max(600),
});

const generateSchema = z.object({
  slides: z.array(slideSchema).min(1).max(100).optional(),
  text: z.string().optional(),
  duration: z.number().min(1).max(3600).optional(),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { slides, text, duration, projectId } = validation.data;

    // Opção 1: Gerar a partir de slides
    if (slides && slides.length > 0) {
      const result = await SRTGenerator.generateFromSlides(
        slides.map((s, i) => ({
          id: s.id || `slide-${i + 1}`,
          text: s.text,
          duration: s.duration,
        })),
        projectId
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        srtUrl: result.srtUrl,
        vttUrl: result.vttUrl,
        segmentCount: result.segmentCount,
        format: 'srt',
        message: 'Legendas geradas com sucesso',
      });
    }

    // Opção 2: Gerar a partir de texto simples
    if (text && duration) {
      const result = await SRTGenerator.generateFromText(text, duration, projectId);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        srtUrl: result.srtUrl,
        vttUrl: result.vttUrl,
        segmentCount: result.segmentCount,
        format: 'srt',
        message: 'Legendas geradas com sucesso',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Forneça slides ou text+duration' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Erro na API de legendas', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: subtitles/generate'
    });
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Subtitles Generator API',
    version: '1.0.0',
    formats: ['srt', 'vtt'],
    usage: {
      method: 'POST',
      options: [
        {
          name: 'Slides',
          body: {
            slides: [
              { text: 'Texto do slide 1', duration: 10 },
              { text: 'Texto do slide 2', duration: 15 },
            ],
            projectId: 'opcional',
          },
        },
        {
          name: 'Texto simples',
          body: {
            text: 'Texto completo para legendar',
            duration: 60,
            projectId: 'opcional',
          },
        },
      ],
    },
  });
}

