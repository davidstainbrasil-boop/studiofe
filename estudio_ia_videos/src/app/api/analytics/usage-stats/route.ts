/**
 * Usage Statistics Endpoint
 * GET /api/analytics/usage-stats
 * 
 * Returns aggregated usage statistics for the platform.
 * Useful for dashboards and reporting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface TimeRange {
  start: Date;
  end: Date;
}

interface UsageStats {
  period: {
    start: string;
    end: string;
    days: number;
  };
  projects: {
    total: number;
    created: number;
    completed: number;
    inProgress: number;
  };
  renders: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    avgDurationSeconds: number | null;
  };
  storage: {
    totalFiles: number;
    totalSizeBytes: number | null;
    byType: Record<string, number>;
  };
  users: {
    total: number;
    activeInPeriod: number;
    newInPeriod: number;
  };
  timestamp: string;
}

function getTimeRange(period: string): TimeRange {
  const now = new Date();
  const start = new Date();
  
  switch (period) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default: // 24h
      start.setHours(now.getHours() - 24);
  }
  
  return { start, end: now };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const rateLimitBlocked = await applyRateLimit(request, 'analytics-usage-stats-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d';
  
  // Check authentication
  const supabase = getSupabaseForRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  const timeRange = getTimeRange(period);
  
  try {
    // Fetch project stats
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    const { count: createdProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .gte("createdAt", timeRange.start.toISOString());
    
    const { count: completedProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    const { count: inProgressProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    // Fetch render stats
    const { count: totalRenders } = await supabase
      .from('render_jobs')
      .select('*', { count: 'exact', head: true })
      .gte("createdAt", timeRange.start.toISOString());
    
    const { count: completedRenders } = await supabase
      .from('render_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte("createdAt", timeRange.start.toISOString());
    
    const { count: failedRenders } = await supabase
      .from('render_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte("createdAt", timeRange.start.toISOString());
    
    const { count: cancelledRenders } = await supabase
      .from('render_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte("createdAt", timeRange.start.toISOString());

    // Fetch user stats
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte("createdAt", timeRange.start.toISOString());

    // Calculate days in period
    const daysDiff = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));

    const stats: UsageStats = {
      period: {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString(),
        days: daysDiff,
      },
      projects: {
        total: totalProjects || 0,
        created: createdProjects || 0,
        completed: completedProjects || 0,
        inProgress: inProgressProjects || 0,
      },
      renders: {
        total: totalRenders || 0,
        completed: completedRenders || 0,
        failed: failedRenders || 0,
        cancelled: cancelledRenders || 0,
        avgDurationSeconds: null, // Can be calculated from render_jobs data
      },
      storage: {
        totalFiles: 0,
        totalSizeBytes: null,
        byType: {},
      },
      users: {
        total: totalUsers || 0,
        activeInPeriod: 0, // Would need login tracking
        newInPeriod: newUsers || 0,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to fetch usage stats', errorInstance);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
