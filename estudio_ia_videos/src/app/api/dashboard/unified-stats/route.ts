export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@lib/supabase/server'
import { logger } from '@lib/logger';

/**
 * 📊 UNIFIED DASHBOARD STATS API
 * Provides comprehensive statistics for the unified dashboard
 */

interface DashboardStats {
  totalProjects: number
  activeRenders: number
  completedToday: number
  totalViews: number
  avgRenderTime: number
  systemHealth: 'healthy' | 'warning' | 'error'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient() as any
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // [DEV] Bypass check
    const isDevBypass = request.cookies.get('dev_bypass')?.value === 'true'
    if (isDevBypass && !user) {
        // Return Mock Data for Dev Bypass
        return NextResponse.json({
            totalProjects: 5,
            activeRenders: 1,
            completedToday: 2,
            totalViews: 1234,
            avgRenderTime: 2,
            systemHealth: 'healthy'
        })
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 1. Total Projects
    const { count: totalProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id) as any

    if (projectsError) throw projectsError

    // 2. Active Renders (queued or processing)
    // We need to join with projects to filter by user_id, or if render_jobs has user_id (it doesn't seem to have user_id directly, but project_id)
    // Let's assume we want all active renders for the user's projects.
    // Since Supabase RLS usually handles "my projects", we can just query render_jobs if RLS is set up correctly to join projects.
    // However, render_jobs table definition: project_id UUID REFERENCES public.projects(id)
    // If RLS on render_jobs checks project.userId, we are good.
    // Let's try to query render_jobs directly.
    
    // Fetch project IDs first to be safe/explicit if RLS isn't perfect on joins yet
    const { data: userProjects, error: userProjectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)

    if (userProjectsError) throw userProjectsError

    const projectIds = userProjects?.map(p => p.id) ?? []
    
    let activeRenders = 0
    let completedToday = 0
    let avgRenderTime = 0

    if (projectIds.length > 0) {
      const { count: activeCount, error: activeError } = await supabase
        .from('render_jobs')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .in('status', ['queued', 'processing']) as any

      if (activeError) throw activeError
      activeRenders = activeCount || 0

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const { count: completedCount, error: completedError } = await supabase
        .from('render_jobs')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'completed')
        .gte('completed_at', startOfDay.toISOString()) as any

      if (completedError) throw completedError
      completedToday = completedCount || 0

      const { data: recentJobs, error: recentJobsError } = await supabase
        .from('render_jobs')
        .select('started_at, completed_at')
        .in('project_id', projectIds)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .not('started_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10)

      if (recentJobsError) throw recentJobsError

      if (recentJobs && recentJobs.length > 0) {
        const totalDurationMs = recentJobs.reduce((acc, job) => {
          if (!job.started_at || !job.completed_at) return acc
          const start = new Date(job.started_at).getTime()
          const end = new Date(job.completed_at).getTime()
          return acc + (end - start)
        }, 0)
        avgRenderTime = Math.round((totalDurationMs / recentJobs.length) / 1000 / 60)
      }
    }

    // 4. Total Views (Mocked for now as we don't have a clear views table yet, maybe analytics_events?)
    // Let's check analytics_events for 'view_project' or similar
    const { count: viewsCount, error: viewsError } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('event_type', ['project_view', 'project_viewed']) as any

    if (viewsError) throw viewsError

    const totalViews = viewsCount || 0

    // 6. System Health (Mocked or check a health endpoint)
    // We can check if we can connect to DB (which we just did)
    const systemHealth = 'healthy'

    const stats: DashboardStats = {
      totalProjects: totalProjects || 0,
      activeRenders,
      completedToday,
      totalViews,
      avgRenderTime,
      systemHealth
    }

    return NextResponse.json(stats)
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error instanceof Error ? error : new Error(String(error))
, { component: 'API: dashboard/unified-stats' })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
