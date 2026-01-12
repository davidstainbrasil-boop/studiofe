/**
 * DEPRECATED: PPTX Process Endpoint (PROTOTYPE)
 *
 * Este endpoint era um protótipo que retornava dados mock/hardcoded.
 * Foi desativado em favor da implementação real em /api/pptx/upload
 *
 * MIGRAÇÃO: Use POST /api/pptx/upload para processamento real de PPTX
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.warn('[DEPRECATED] /api/pptx/process is a prototype endpoint that has been disabled.');
  console.warn('[DEPRECATED] This endpoint returned mock/hardcoded slide data.');
  console.warn('[MIGRATION] Please use POST /api/pptx/upload for real PPTX processing.');

  return NextResponse.json({
    error: 'Este endpoint é protótipo e foi desativado',
    reason: 'Retornava dados mock/hardcoded (slides fake, URLs de TTS inventadas)',
    migration: {
      use: 'POST /api/pptx/upload',
      description: 'Processamento real de PPTX com parsing verdadeiro'
    },
    deprecated_since: '2026-01-12',
    removal_date: 'TBD'
  }, { status: 501 }); // 501 Not Implemented
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    error: 'Endpoint desativado',
    migration: 'Use POST /api/pptx/upload'
  }, { status: 501 });
}
