export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@lib/auth/auth-options'
import { logger } from '@lib/logger'
import { supabaseAdmin } from '@lib/supabase/server'
import { applyRateLimit } from '@/lib/rate-limit';

async function isAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) {
    return false
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  return data?.role === 'admin'
}

export async function GET(_request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(_request, 'admin-stats-get', 30);
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalProjects,
      projectsLast24h,
      renderSummary,
      billingStats
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).then(r => r.count || 0),
      supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).then(r => r.count || 0),
      supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).gte("updated_at", last24h.toISOString()).then(r => r.count || 0),
      getRenderJobSummary(last24h),
      getBillingStats(),
    ])

    const usedStorageBytes = billingStats.totalStorageUsed; 
    const totalStorageBytes = 500 * 1024 * 1024 * 1024; // 500GB Quota
    const storageUtilization = (usedStorageBytes / totalStorageBytes) * 100;

    // Active Sessions: Distinct users with activity in last 1h
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    let activeSessions = 0;
    try {
        // Since we can't do count(distinct(userId)) easily via supabaseAdmin simple query builders without rpc? 
        // We can do a range query and loose distinct check if volume is low, OR use a flag in users table if we had it.
        // Best approach for MVP stats: Count events in last hour.
        // Or if we need exact unique users:
        
         const { data: events, error } = await supabaseAdmin
            .from('analytics_events')
            .select('userId') // Correct casing from Schema
            .gte('created_at', oneHourAgo);
            
        if (error) {
            logger.warn('Failed to fetch active sessions', { error });
        } else {
             const uniqueUsers = new Set(events?.map(e => e.userId).filter(Boolean));
             activeSessions = uniqueUsers.size;
        }
    } catch (e) {
        logger.error('Active sessions query failed', e instanceof Error ? e : new Error(String(e)), { component: 'API: admin/stats' });
    }

    return NextResponse.json({
      totalUsers,
      activeSessions,
      totalProjects,
      projectsLast24h,
      usedStorage: usedStorageBytes,
      usedStorageBytes: usedStorageBytes.toString(),
      totalStorageBytes: totalStorageBytes.toString(),
      storageUtilization,
      renderJobs: renderSummary,
      plans: billingStats.plans,
      generatedAt: now.toISOString(),
    })
  } catch (error) {
    logger.error('Failed to fetch stats', error instanceof Error ? error : new Error(String(error))
    , { component: 'API: admin/stats' })
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}


// Helper for Prisma aggregations
async function getBillingStats() {
    const { prisma } = await import('@/lib/prisma');
    
    // Aggregations might need casting if types aren't fully generated yet
    const usageAgg = await (prisma as unknown as { user_usage: { aggregate: (args: Record<string, unknown>) => Promise<{ _sum: { rendersCount: number | null; storageUsedBytes: number | null } }> } }).user_usage.aggregate({
        _sum: {
            rendersCount: true,
            storageUsedBytes: true
        }
    });

    const userPlans = await prisma.users.groupBy({
        by: ['plan_tier'] as never, // Cast to never to avoid Enum issues if not fully regenerated
        _count: {
            id: true
        }
    });

    interface PlanGroup { plan_tier: string | null; _count: { id: number }; }
    
    return {
        totalRenders: usageAgg._sum.rendersCount || 0,
        totalStorageUsed: usageAgg._sum.storageUsedBytes || 0,
        plans: (userPlans as PlanGroup[]).reduce((acc: Record<string, number>, curr: PlanGroup) => {
            acc[curr.plan_tier || 'free'] = curr._count.id;
            return acc;
        }, {} as Record<string, number>)
    };
}

async function getRenderJobSummary(since: Date) {
  const [total, processing, failed, completed] = await Promise.all([
    supabaseAdmin.from('render_jobs').select('*', { count: 'exact', head: true }).then(r => r.count || 0),
    supabaseAdmin.from('render_jobs').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing', 'queued']).then(r => r.count || 0),
    supabaseAdmin.from('render_jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte("updated_at", since.toISOString()).then(r => r.count || 0),
    supabaseAdmin.from('render_jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte("updated_at", since.toISOString()).then(r => r.count || 0),
  ])

  return {
    total,
    processing,
    failedLast24h: failed,
    completedLast24h: completed,
  }
}

