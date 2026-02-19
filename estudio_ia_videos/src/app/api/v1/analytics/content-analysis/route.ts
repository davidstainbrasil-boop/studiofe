import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { getServerAuth } from '@lib/auth/unified-session'
import { applyRateLimit } from '@/lib/rate-limit'
import { prisma } from '@lib/prisma'
import { GET as getAdvancedAnalytics } from '@/app/api/v1/analytics/advanced/route'

interface ContentMetrics {
  viewCount: number
  engagementRate: number
  completionRate: number
  averageWatchTime: number
  retentionRate: number
  interactionCount: number
  shareCount: number
  downloadCount: number
}

interface AnalyticsData {
  date: string
  views: number
  engagement: number
  completion: number
  retention: number
}

interface ContentPerformance {
  contentId: string
  title: string
  type: 'pptx' | 'video' | 'avatar' | 'template'
  score: number
  metrics: ContentMetrics
  insights: string[]
  recommendations: string[]
}

function resolveDays(timeRange: string): number {
  if (timeRange === '7d') return 7
  if (timeRange === '90d') return 90
  return 30
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function buildForwardHeaders(source: NextRequest): Headers {
  const headers = new Headers()
  const cookie = source.headers.get('cookie')
  const authorization = source.headers.get('authorization')
  const testUserId = source.headers.get('x-user-id')

  if (cookie) headers.set('cookie', cookie)
  if (authorization) headers.set('authorization', authorization)
  if (testUserId) headers.set('x-user-id', testUserId)
  return headers
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const timeRange = String(body?.timeRange || '30d')
    const days = resolveDays(timeRange)
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const advancedRequest = new NextRequest(
      new URL(`/api/v1/analytics/advanced?days=${days}`, request.url),
      {
        method: 'GET',
        headers: buildForwardHeaders(request)
      }
    )
    const advancedResponse = await getAdvancedAnalytics(advancedRequest)
    const advancedPayload = await advancedResponse.json()

    if (!advancedResponse.ok || !advancedPayload?.success) {
      return NextResponse.json(
        {
          success: false,
          error: advancedPayload?.error || 'Failed to fetch advanced analytics'
        },
        { status: advancedResponse.status || 500 }
      )
    }

    const [renderJobs, recentProjects, analyticsEvents] = await Promise.all([
      prisma.render_jobs.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          projectId: true,
          status: true,
          createdAt: true,
          durationMs: true
        }
      }),
      prisma.projects.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          type: true
        }
      }),
      prisma.analytics_events.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate }
        },
        select: {
          eventType: true
        }
      })
    ])

    const totalJobs = renderJobs.length
    const completedJobs = renderJobs.filter((job) => job.status === 'completed').length
    const failedJobs = renderJobs.filter((job) => job.status === 'failed').length
    const avgDurationSec = totalJobs > 0
      ? renderJobs.reduce((sum, job) => sum + (job.durationMs || 0), 0) / totalJobs / 1000
      : 0

    const viewEvents = analyticsEvents.filter((event) => event.eventType.includes('view')).length
    const interactionEvents = analyticsEvents.filter((event) => event.eventType.includes('click') || event.eventType.includes('interaction')).length
    const shareEvents = analyticsEvents.filter((event) => event.eventType.includes('share')).length
    const downloadEvents = analyticsEvents.filter((event) => event.eventType.includes('download')).length

    const completionRate = totalJobs > 0 ? round((completedJobs / totalJobs) * 100) : 100
    const engagementRate = totalJobs > 0
      ? round(((interactionEvents + completedJobs) / (totalJobs * 2)) * 100)
      : 0
    const retentionRate = round(Math.min(100, completionRate * 0.92))

    const currentMetrics: ContentMetrics = {
      viewCount: viewEvents + totalJobs,
      engagementRate,
      completionRate,
      averageWatchTime: Math.round(avgDurationSec),
      retentionRate,
      interactionCount: interactionEvents,
      shareCount: shareEvents,
      downloadCount: downloadEvents
    }

    const daily = new Map<string, AnalyticsData>()
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      daily.set(date, {
        date,
        views: 0,
        engagement: 0,
        completion: 0,
        retention: 0
      })
    }

    renderJobs.forEach((job) => {
      const date = (job.createdAt || new Date()).toISOString().split('T')[0]
      const entry = daily.get(date)
      if (!entry) return

      entry.views += 1
      entry.engagement += job.status === 'completed' ? Math.round(engagementRate) : Math.round(engagementRate * 0.6)
      entry.completion += job.status === 'completed' ? 100 : 0
      entry.retention += job.status === 'completed' ? Math.round(retentionRate) : Math.round(retentionRate * 0.5)
    })

    const analyticsData = Array.from(daily.values()).map((entry) => ({
      date: entry.date,
      views: entry.views,
      engagement: entry.views > 0 ? Math.round(entry.engagement / entry.views) : 0,
      completion: entry.views > 0 ? Math.round(entry.completion / entry.views) : 0,
      retention: entry.views > 0 ? Math.round(entry.retention / entry.views) : 0
    }))

    const contentPerformance: ContentPerformance[] = recentProjects.map((project) => {
      const projectJobs = renderJobs.filter((job) => job.projectId === project.id)
      const projectTotal = projectJobs.length
      const projectCompleted = projectJobs.filter((job) => job.status === 'completed').length
      const score = projectTotal > 0 ? round((projectCompleted / projectTotal) * 100) : 0

      const rawType = String(project.type || '').toLowerCase()
      let normalizedType: ContentPerformance['type'] = 'template'
      if (rawType.includes('ppt')) normalizedType = 'pptx'
      else if (rawType.includes('avatar')) normalizedType = 'avatar'
      else if (rawType.includes('video')) normalizedType = 'video'

      return {
        contentId: project.id,
        title: project.name,
        type: normalizedType,
        score,
        metrics: {
          viewCount: projectTotal,
          engagementRate: score,
          completionRate: score,
          averageWatchTime: Math.round(avgDurationSec),
          retentionRate: round(score * 0.9),
          interactionCount: interactionEvents,
          shareCount: shareEvents,
          downloadCount: downloadEvents
        },
        insights: [
          `Renderizações no período: ${projectTotal}`,
          `Taxa de conclusão: ${score}%`
        ],
        recommendations: score < 70
          ? ['Revisar narrativa e estrutura do conteúdo', 'Aumentar clareza de objetivos por slide']
          : ['Manter padrão atual de conteúdo', 'Testar versão compacta para dispositivos móveis']
      }
    })

    const audienceData = [
      { segment: 'Visualizações', percentage: viewEvents > 0 ? 45 : 0, performance: completionRate, color: '#1e40af' },
      { segment: 'Interações', percentage: interactionEvents > 0 ? 35 : 0, performance: engagementRate, color: '#0f766e' },
      { segment: 'Downloads', percentage: downloadEvents > 0 ? 20 : 0, performance: retentionRate, color: '#b45309' }
    ]

    return NextResponse.json({
      success: true,
      metrics: currentMetrics,
      analytics: analyticsData,
      audience: audienceData,
      contentPerformance,
      insights: {
        opportunities: [
          {
            type: 'completion',
            title: 'Conclusão de conteúdo',
            description: `Taxa atual de conclusão: ${completionRate}%`,
            impact: completionRate < 70 ? 'high' : 'medium'
          },
          {
            type: 'quality',
            title: 'Falhas em renderização',
            description: `${failedJobs} falhas registradas no período`,
            impact: failedJobs > 0 ? 'high' : 'low'
          }
        ],
        trends: [
          { metric: 'Render Jobs', value: String(totalJobs) },
          { metric: 'Completion Rate', value: `${completionRate}%` },
          { metric: 'Average Watch Time', value: `${Math.round(avgDurationSec)}s` },
          { metric: 'Advanced Funnel', value: JSON.stringify(advancedPayload.data?.funnel || {}) }
        ]
      },
      source: 'real-database',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Content Analysis Error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: v1/analytics/content-analysis'
    })
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze content'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const rateLimitBlocked = await applyRateLimit(req, 'v1-analytics-content-analysis-get', 60)
  if (rateLimitBlocked) return rateLimitBlocked

  return NextResponse.json({
    message: 'Content Analysis Engine API',
    version: '1.0.0',
    endpoints: {
      analyze: 'POST /api/v1/analytics/content-analysis',
      export: 'GET /api/v1/analytics/content-analysis/export',
      realtime: 'GET /api/v1/analytics/content-analysis/realtime'
    },
    source: 'real-database'
  })
}

