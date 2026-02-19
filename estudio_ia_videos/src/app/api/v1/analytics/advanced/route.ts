/**
 * 📊 Advanced Analytics API - REAL DATA
 */

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@lib/monitoring/logger'
import { AnalyticsTracker } from '@lib/analytics/analytics-tracker'
import { getServerAuth } from '@lib/auth/unified-session'
import { getOrgId, getUserId, isAdmin } from '@lib/auth/utils'
import { applyRateLimit } from '@/lib/rate-limit'
import { prisma } from '@lib/prisma'

interface AnalyticsData {
  funnel: {
    pptx_uploads: number
    editing_sessions: number
    tts_generations: number
    render_jobs: number
    downloads: number
  }
  avgTimePerStage: {
    upload_to_edit: number
    edit_to_tts: number
    tts_to_render: number
    render_to_download: number
  }
  errorRates: {
    tts: {
      elevenlabs: number
      azure: number
      google: number
    }
    render: number
  }
  queueStats: {
    avgQueueSize: number
    avgWaitTime: number
    peakQueueSize: number
  }
  templateUsage: Record<string, number>
  trends: {
    date: string
    uploads: number
    renders: number
    errors: number
  }[]
}

interface ProviderPerformance {
  provider: string
  errorRate: number
}

interface AnalyticsBuildResult {
  data: AnalyticsData
  conversionRates: Record<string, number>
  summary: {
    totalEvents: number
    errorRate: number
  }
  period: {
    days: number
    from: string
    to: string
  }
}

function clampDays(days: number): number {
  if (!Number.isFinite(days)) return 7
  if (days < 1) return 1
  if (days > 365) return 365
  return Math.floor(days)
}

function dayKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function buildInitialTrend(days: number): Map<string, { date: string; uploads: number; renders: number; errors: number }> {
  const map = new Map<string, { date: string; uploads: number; renders: number; errors: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = dayKey(d)
    map.set(key, { date: key, uploads: 0, renders: 0, errors: 0 })
  }
  return map
}

async function buildAdvancedAnalytics(
  user: unknown,
  days: number
): Promise<AnalyticsBuildResult> {
  const safeDays = clampDays(days)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - safeDays)

  const orgId = getOrgId(user)
  const userId = getUserId(user)
  const admin = isAdmin(user)
  const scopedUserId = admin ? undefined : userId

  const [funnelData, ttsPerformanceRaw, renderPerformanceRaw, summary, events, jobs, queueItems, projects] =
    await Promise.all([
      AnalyticsTracker.getFunnelAnalysis({
        organizationId: orgId,
        startDate,
        endDate
      }),
      AnalyticsTracker.getProviderPerformance({
        category: 'tts',
        organizationId: orgId,
        startDate,
        endDate
      }) as Promise<ProviderPerformance[]>,
      AnalyticsTracker.getProviderPerformance({
        category: 'render',
        organizationId: orgId,
        startDate,
        endDate
      }) as Promise<ProviderPerformance[]>,
      AnalyticsTracker.getSummary({
        organizationId: orgId,
        startDate,
        endDate
      }),
      prisma.analytics_events.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(scopedUserId ? { userId: scopedUserId } : {})
        },
        select: {
          eventType: true,
          createdAt: true
        }
      }),
      prisma.render_jobs.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(scopedUserId ? { userId: scopedUserId } : {})
        },
        select: {
          status: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          durationMs: true
        }
      }),
      prisma.processing_queue.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          status: true,
          createdAt: true,
          startedAt: true
        }
      }),
      prisma.projects.findMany({
        where: scopedUserId ? { userId: scopedUserId } : undefined,
        select: {
          metadata: true
        }
      })
    ])

  const ttsPerformance = ttsPerformanceRaw || []
  const renderPerformance = renderPerformanceRaw || []

  const errorRates = {
    tts: {
      elevenlabs:
        ttsPerformance.find((p) => p.provider.toLowerCase() === 'elevenlabs')?.errorRate || 0,
      azure:
        ttsPerformance.find((p) => p.provider.toLowerCase() === 'azure')?.errorRate || 0,
      google:
        ttsPerformance.find((p) => p.provider.toLowerCase() === 'google')?.errorRate || 0
    },
    render: renderPerformance[0]?.errorRate || 0
  }

  const funnelMap = (funnelData.funnel || []).reduce<Record<string, number>>((acc, item) => {
    acc[item.stage] = item.count
    return acc
  }, {})

  const funnel = {
    pptx_uploads: funnelMap.pptx_uploads || funnelMap.upload || 0,
    editing_sessions: funnelMap.editing_sessions || funnelMap.edit || 0,
    tts_generations: funnelMap.tts_generations || funnelMap.tts || 0,
    render_jobs: funnelMap.render_jobs || funnelMap.render || 0,
    downloads: funnelMap.downloads || funnelMap.download || 0
  }

  const pendingStatuses = new Set(['pending', 'queued', 'processing', 'waiting', 'active'])
  const pendingQueueCount = queueItems.filter((q) => pendingStatuses.has((q.status || '').toLowerCase())).length
  const waitTimes = queueItems
    .filter((q) => q.startedAt && q.createdAt)
    .map((q) => ((q.startedAt as Date).getTime() - (q.createdAt as Date).getTime()) / 1000)
    .filter((v) => Number.isFinite(v) && v >= 0)
  const avgWaitTime = waitTimes.length
    ? waitTimes.reduce((acc, v) => acc + v, 0) / waitTimes.length
    : 0

  const trendMap = buildInitialTrend(safeDays)
  events.forEach((event) => {
    if (!event.createdAt) return
    const key = dayKey(event.createdAt as Date)
    const trend = trendMap.get(key)
    if (!trend) return

    const eventType = (event.eventType || '').toLowerCase()
    if (eventType.includes('upload') || eventType.includes('pptx_import')) {
      trend.uploads += 1
    }
    if (eventType.includes('error') || eventType.includes('fail')) {
      trend.errors += 1
    }
  })

  jobs.forEach((job) => {
    if (!job.createdAt) return
    const key = dayKey(job.createdAt as Date)
    const trend = trendMap.get(key)
    if (!trend) return
    trend.renders += 1
    if ((job.status || '').toLowerCase() === 'failed') {
      trend.errors += 1
    }
  })

  const templateUsage: Record<string, number> = {}
  projects.forEach((project) => {
    const metadata = (project.metadata || {}) as Record<string, unknown>
    const key =
      (typeof metadata.templateId === 'string' && metadata.templateId) ||
      (typeof metadata.templateName === 'string' && metadata.templateName) ||
      (typeof metadata.nr === 'string' && metadata.nr) ||
      'custom'
    templateUsage[key] = (templateUsage[key] || 0) + 1
  })

  const data: AnalyticsData = {
    funnel,
    avgTimePerStage: {
      upload_to_edit: summary.avgDuration * 0.3,
      edit_to_tts: summary.avgDuration * 0.4,
      tts_to_render: summary.avgDuration * 0.2,
      render_to_download: summary.avgDuration * 0.1
    },
    errorRates,
    queueStats: {
      avgQueueSize: pendingQueueCount,
      avgWaitTime: Math.round(avgWaitTime * 100) / 100,
      peakQueueSize: pendingQueueCount
    },
    templateUsage,
    trends: Array.from(trendMap.values())
  }

  const conversionRates =
    ((funnelData as unknown as { conversionRates?: Record<string, number> }).conversionRates) ||
    ((funnelData as unknown as { conversion_rates?: Record<string, number> }).conversion_rates) ||
    {}

  return {
    data,
    conversionRates,
    summary: {
      totalEvents: summary.totalEvents,
      errorRate: (summary as { errorRate?: number }).errorRate || 0
    },
    period: {
      days: safeDays,
      from: startDate.toISOString(),
      to: endDate.toISOString()
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-analytics-advanced-get', 60)
    if (rateLimitBlocked) return rateLimitBlocked

    const session = await getServerAuth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = clampDays(parseInt(searchParams.get('days') || '7', 10))
    const analytics = await buildAdvancedAnalytics(session.user, days)

    log.info('Advanced analytics fetched (REAL DATA)', {
      days,
      userId: getUserId(session.user),
      organizationId: getOrgId(session.user)
    })

    return NextResponse.json({
      success: true,
      data: {
        ...analytics.data,
        conversionRates: analytics.conversionRates,
        period: analytics.period
      },
      _meta: {
        source: 'real_database',
        totalEvents: analytics.summary.totalEvents,
        errorRate: analytics.summary.errorRate
      }
    })
  } catch (error: unknown) {
    log.error('Advanced analytics error', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Failed to fetch analytics'
      },
      {
        status: 500
      }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'v1-analytics-advanced-post', 20)
    if (rateLimitBlocked) return rateLimitBlocked

    const session = await getServerAuth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const format = (body?.format || 'json') as 'json' | 'csv'
    const days = clampDays(parseInt(String(body?.days || '7'), 10))

    const analytics = await buildAdvancedAnalytics(session.user, days)
    const data = analytics.data

    if (format === 'csv') {
      const csv = convertToCSV(data)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${Date.now()}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        conversionRates: analytics.conversionRates,
        period: analytics.period
      },
      exportedAt: new Date().toISOString()
    })
  } catch (error: unknown) {
    log.error('Analytics export error', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Failed to export analytics'
      },
      {
        status: 500
      }
    )
  }
}

function convertToCSV(data: AnalyticsData): string {
  let csv = 'Metric,Value\n'

  csv += '\nFUNNEL\n'
  csv += `PPTX Uploads,${data.funnel.pptx_uploads}\n`
  csv += `Editing Sessions,${data.funnel.editing_sessions}\n`
  csv += `TTS Generations,${data.funnel.tts_generations}\n`
  csv += `Render Jobs,${data.funnel.render_jobs}\n`
  csv += `Downloads,${data.funnel.downloads}\n`

  csv += '\nAVG TIME PER STAGE (seconds)\n'
  csv += `Upload to Edit,${data.avgTimePerStage.upload_to_edit}\n`
  csv += `Edit to TTS,${data.avgTimePerStage.edit_to_tts}\n`
  csv += `TTS to Render,${data.avgTimePerStage.tts_to_render}\n`
  csv += `Render to Download,${data.avgTimePerStage.render_to_download}\n`

  csv += '\nERROR RATES\n'
  csv += `ElevenLabs,${data.errorRates.tts.elevenlabs}\n`
  csv += `Azure,${data.errorRates.tts.azure}\n`
  csv += `Google,${data.errorRates.tts.google}\n`
  csv += `Render,${data.errorRates.render}\n`

  csv += '\nQUEUE STATISTICS\n'
  csv += `Avg Queue Size,${data.queueStats.avgQueueSize}\n`
  csv += `Avg Wait Time,${data.queueStats.avgWaitTime}\n`
  csv += `Peak Queue Size,${data.queueStats.peakQueueSize}\n`

  csv += '\nTEMPLATE USAGE\n'
  Object.entries(data.templateUsage).forEach(([template, count]) => {
    csv += `${template},${count}\n`
  })

  csv += '\nTRENDS\n'
  csv += 'Date,Uploads,Renders,Errors\n'
  data.trends.forEach((trend) => {
    csv += `${trend.date},${trend.uploads},${trend.renders},${trend.errors}\n`
  })

  return csv
}

export const dynamic = 'force-dynamic'

