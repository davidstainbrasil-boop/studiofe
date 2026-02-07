
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface RenderStats {
  totalRenders: number;
  successRate: number;
  performanceMetrics: {
    averageCpuUsage: number;
    averageMemoryUsage: number;
    averageRenderTime: number;
  };
  recentActivity: {
    completed: number;
    failed: number;
    processing: number;
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Buscar contagens reais do banco
    const [totalResult, completedResult, failedResult, processingResult] = await Promise.all([
      supabase.from('render_jobs').select('id', { count: 'exact', head: true }),
      supabase.from('render_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('render_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('render_jobs').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
    ]);

    const totalRenders = totalResult.count ?? 0;
    const completed = completedResult.count ?? 0;
    const failed = failedResult.count ?? 0;
    const processing = processingResult.count ?? 0;
    const successRate = totalRenders > 0 ? (completed / totalRenders) * 100 : 0;

    // Buscar tempo médio de renderização dos jobs completados (últimos 100)
    const { data: recentJobs } = await supabase
      .from('render_jobs')
      .select('started_at, completed_at')
      .eq('status', 'completed')
      .not('started_at', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100);

    let averageRenderTime = 0;
    if (recentJobs && recentJobs.length > 0) {
      const totalTime = recentJobs.reduce((sum, job) => {
        const start = new Date(job.started_at).getTime();
        const end = new Date(job.completed_at).getTime();
        return sum + (end - start);
      }, 0);
      averageRenderTime = totalTime / recentJobs.length / 1000; // seconds
    }

    const stats: RenderStats = {
      totalRenders,
      successRate: Number(successRate.toFixed(1)),
      performanceMetrics: {
        averageCpuUsage: 0, // Requires system metrics collector
        averageMemoryUsage: 0,
        averageRenderTime,
      },
      recentActivity: {
        completed,
        failed,
        processing,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to fetch render stats', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: render/stats',
    });
    return NextResponse.json({
      error: 'Failed to fetch render stats',
      code: 'RENDER_STATS_ERROR',
      details: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : 'Unknown error')
        : undefined,
    }, { status: 500 });
  }
}
