/**
 * API Metrics REAL
 * GET /api/metrics/dashboard
 * 
 * Retorna métricas REAIS do sistema buscando do banco de dados
 * Substitui dados mockados por queries reais
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { cachedQuery } from '@/lib/cache/redis-cache'

export const dynamic = 'force-dynamic'

interface DashboardMetrics {
  overview: {
    totalProjects: number
    completedProjects: number
    processingProjects: number
    draftProjects: number
    totalDuration: number
    totalViews: number
    totalDownloads: number
    avgProcessingTime: number
  }
  projectStatus: Array<{ status: string; count: number }>
  recentActivity: Array<{
    id: string
    type: string
    title: string
    timestamp: string
    projectId?: string
    projectName?: string
  }>
  performance: {
    avgProcessingTime: number
    successRate: number
    failedJobs: number
    queueLength: number
  }
  storage: {
    used: number
    limit: number
    byType: Record<string, number>
  }
  period: string
  dateRange: {
    start: string
    end: string
  }
}

interface ProjectRow {
  id: string
  name: string
  status: string | null
  created_at: string | null
  updated_at: string | null
  metadata: Record<string, unknown> | null
}

interface RenderJobRow {
  id: string
  status: string
  progress: number
  started_at: string | null
  completed_at: string | null
  project_id: string
  created_at: string
  error_message: string | null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    const userId = user.id

    // Calcular data range baseado no período
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'month':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Tentar usar cache
    const cacheKey = `dashboard:metrics:${userId}:${period}`
    
    const metrics = await cachedQuery<DashboardMetrics>(
      cacheKey,
      async () => {
        // ===== QUERIES REAIS DO BANCO =====

        // 1. Contagem de projetos por status
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, status, createdAt, updatedAt, metadata')
          .eq('userId', userId)

        if (projectsError) {
          logger.warn('Failed to fetch projects', { error: projectsError.message, component: 'API: metrics/dashboard' })
        }

        // Cast para unknown primeiro para evitar erros de tipo
        const projectList = (projects || []) as unknown as ProjectRow[]
        
        const statusCounts = projectList.reduce((acc: Record<string, number>, p: ProjectRow) => {
          const status = p.status || 'unknown'
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // 2. Jobs de render
        const { data: renderJobs, error: jobsError } = await supabase
          .from('render_jobs')
          .select('id, status, createdAt, completedAt, projectId')
          .eq('userId', userId)
          .gte('createdAt', startDate.toISOString())

        if (jobsError) {
          logger.warn('Failed to fetch render jobs', { error: jobsError.message, component: 'API: metrics/dashboard' })
        }

        // Cast para unknown primeiro
        const jobs = (renderJobs || []) as unknown as RenderJobRow[]

        // Calcular tempo médio de processamento
        const completedJobs = jobs.filter((j: RenderJobRow) => j.status === 'completed' && j.completed_at)
        let avgProcessingTime = 0

        if (completedJobs.length > 0) {
          const totalTime = completedJobs.reduce((sum: number, job: RenderJobRow) => {
            const start = new Date(job.created_at).getTime()
            const end = new Date(job.completed_at!).getTime()
            return sum + (end - start)
          }, 0)
          avgProcessingTime = Math.round(totalTime / completedJobs.length / 1000 / 60) // em minutos
        }

        // Taxa de sucesso
        const failedJobs = jobs.filter((j: RenderJobRow) => j.status === 'failed').length
        const successRate = jobs.length > 0 
          ? Math.round((completedJobs.length / jobs.length) * 100)
          : 100

        // 3. Atividade recente
        const recentActivity = jobs
          .slice(0, 10)
          .map((job: RenderJobRow) => ({
            id: job.id,
            type: job.status === 'completed' ? 'render_complete' : 
                  job.status === 'failed' ? 'error' : 'render_started',
            title: job.status === 'completed' ? 'Renderização concluída' :
                   job.status === 'failed' ? 'Erro na renderização' : 'Renderização iniciada',
            timestamp: job.created_at,
            projectId: job.project_id
          }))

        // 4. Calcular duração total (soma de metadata.estimated_duration)
        let totalDuration = 0
        for (const project of projectList) {
          if (project.metadata && typeof project.metadata === 'object') {
            const metadata = project.metadata as { estimated_duration?: number }
            totalDuration += metadata.estimated_duration || 0
          }
        }

        // 5. Jobs na fila (status = queued ou processing)
        const queueLength = jobs.filter((j: RenderJobRow) => 
          j.status === 'queued' || j.status === 'processing'
        ).length

        return {
          overview: {
            totalProjects: projectList.length,
            completedProjects: statusCounts['completed'] || 0,
            processingProjects: statusCounts['in-progress'] || 0,
            draftProjects: statusCounts['draft'] || 0,
            totalDuration: Math.round(totalDuration / 60), // em minutos
            totalViews: 0, // TODO: implementar tracking de views
            totalDownloads: completedJobs.length,
            avgProcessingTime
          },
          projectStatus: Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count: count as number
          })),
          recentActivity,
          performance: {
            avgProcessingTime,
            successRate,
            failedJobs,
            queueLength
          },
          storage: {
            used: 0, // TODO: calcular uso real do storage
            limit: 5 * 1024 * 1024 * 1024, // 5GB
            byType: {}
          },
          period,
          dateRange: {
            start: startDate.toISOString(),
            end: now.toISOString()
          }
        } as DashboardMetrics
      },
      60 // Cache por 1 minuto (TTL em segundos)
    )

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Metrics API error', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: metrics/dashboard'
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
