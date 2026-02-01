import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Render Jobs Analytics API
 * 
 * GET /api/analytics/render-jobs - Get render job statistics and history
 */

// Types
interface RenderJobSummary {
  id: string;
  projectName: string;
  status: 'completed' | 'failed' | 'processing' | 'queued' | 'cancelled';
  duration: number;
  slidesCount: number;
  outputSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface RenderStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  queued: number;
  avgDuration: number;
  totalDuration: number;
  successRate: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get render jobs from user metadata
    const metadata = user.user_metadata || {};
    const allJobs = (metadata.render_jobs || []) as RenderJobSummary[];
    
    // Filter by date range
    let filteredJobs = allJobs.filter(job => new Date(job.createdAt) >= startDate);
    
    // Filter by status if specified
    if (status && status !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.status === status);
    }

    // Sort by date (newest first)
    filteredJobs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate stats
    const completedJobs = filteredJobs.filter(j => j.status === 'completed');
    const failedJobs = filteredJobs.filter(j => j.status === 'failed');
    const processingJobs = filteredJobs.filter(j => j.status === 'processing');
    const queuedJobs = filteredJobs.filter(j => j.status === 'queued');

    const totalDuration = completedJobs.reduce((sum, j) => sum + j.duration, 0);
    const avgDuration = completedJobs.length > 0 ? totalDuration / completedJobs.length : 0;
    const successRate = filteredJobs.length > 0 
      ? (completedJobs.length / filteredJobs.length) * 100 
      : 100;

    const stats: RenderStats = {
      total: filteredJobs.length,
      completed: completedJobs.length,
      failed: failedJobs.length,
      processing: processingJobs.length,
      queued: queuedJobs.length,
      avgDuration: Math.round(avgDuration),
      totalDuration,
      successRate: Math.round(successRate * 10) / 10,
    };

    // Paginate
    const paginatedJobs = filteredJobs.slice(offset, offset + limit);

    // Daily distribution
    const dailyDistribution: Record<string, { completed: number; failed: number }> = {};
    filteredJobs.forEach(job => {
      const date = new Date(job.createdAt).toISOString().split('T')[0];
      if (!dailyDistribution[date]) {
        dailyDistribution[date] = { completed: 0, failed: 0 };
      }
      if (job.status === 'completed') {
        dailyDistribution[date].completed++;
      } else if (job.status === 'failed') {
        dailyDistribution[date].failed++;
      }
    });

    // Convert to array for charting
    const dailyData = Object.entries(dailyDistribution)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Error summary
    const errorSummary = failedJobs.reduce((acc, job) => {
      const error = job.errorMessage || 'Unknown error';
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = Object.entries(errorSummary)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      jobs: paginatedJobs.map(job => ({
        id: job.id,
        projectName: job.projectName,
        status: job.status,
        duration: job.duration,
        slidesCount: job.slidesCount,
        outputSize: job.outputSize,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
      stats,
      dailyData,
      topErrors,
      pagination: {
        total: filteredJobs.length,
        limit,
        offset,
        hasMore: offset + limit < filteredJobs.length,
      },
      period,
    });
  } catch (error) {
    console.error('Render jobs analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
