/**
 * DEPRECATED: PPTX Generate Timeline Endpoint (PROTOTYPE)
 *
 * Este endpoint era um protótipo que retornava timeline com assets fake.
 * Gerava voiceovers, avatars e música de fundo com arquivos inexistentes.
 *
 * MIGRAÇÃO: Use o fluxo completo:
 * 1. POST /api/pptx/upload - Upload e parsing real
 * 2. POST /api/render/start - Renderização com assets reais
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/logger';

export async function POST(req: NextRequest) {
  logger.warn('[DEPRECATED] /api/v1/pptx/generate-timeline is a prototype endpoint that has been disabled.', {
    component: 'API: v1/pptx/generate-timeline'
  });
  logger.warn('[DEPRECATED] This endpoint returned mock timeline with fake audio files.', {
    component: 'API: v1/pptx/generate-timeline'
  });
  logger.warn('[MIGRATION] Use POST /api/pptx/upload + POST /api/render/start for real workflow.', {
    component: 'API: v1/pptx/generate-timeline'
  });

  return NextResponse.json({
    error: 'Este endpoint é protótipo e foi desativado',
    reason: 'Retornava timeline com assets fake (voiceover_slide_1.mp3, background_corporate_music.mp3)',
    migration: {
      step1: 'POST /api/pptx/upload - Upload e parsing do PPTX',
      step2: 'POST /api/render/start - Renderização com TTS real',
      description: 'Workflow completo com geração real de assets'
    },
    deprecated_since: '2026-01-12',
    removal_date: 'TBD'
  }, { status: 501 }); // 501 Not Implemented
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    error: 'Endpoint desativado',
    migration: 'Use POST /api/pptx/upload + POST /api/render/start'
  }, { status: 501 });
}
