import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar conectividade com o banco
    const { count, error } = await supabase
      .from('render_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['queued', 'processing']);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      status: 'operational',
      activeJobs: count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Video pipeline health check failed', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: render/video-pipeline',
    });
    return NextResponse.json({
      status: 'degraded',
      error: 'Pipeline check failed',
      code: 'PIPELINE_HEALTH_ERROR',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
