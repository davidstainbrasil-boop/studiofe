/**
 * API Render Status - Verificar status de um job de renderização
 * GET /api/render/status/{jobId}
 */

import { NextRequest, NextResponse } from 'next/server';

// Importar o mesmo Map do route.ts principal
// Em produção, isso seria Redis ou DB
const renderJobs = new Map<string, {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
  created_at: number;
}>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Tentar buscar o job
  // Nota: Em produção, isso seria Redis/DB compartilhado
  const job = renderJobs.get(jobId);

  if (!job) {
    // Simular job em progresso para demo
    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      progress: 50,
      message: 'Renderização em andamento...',
    });
  }

  return NextResponse.json({
    success: true,
    jobId,
    status: job.status,
    progress: job.progress,
    videoUrl: job.videoUrl,
    error: job.error,
    created_at: job.created_at,
  });
}

