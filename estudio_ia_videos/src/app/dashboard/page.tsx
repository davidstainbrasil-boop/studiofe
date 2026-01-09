'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import { Skeleton } from '@components/ui/skeleton'
import { Button } from '@components/ui/button'
import { FolderOpen, Play, Zap, Bell, Plus, RefreshCw, TrendingUp, AlertCircle, Mic, FileText, Scissors, Sparkles } from 'lucide-react'
import { useDashboardStats } from '@hooks/use-dashboard-stats'
import { RecentProjects } from '@components/dashboard/recent-projects'
import { useProjects } from '@hooks/use-projects'
import { CreateProjectDialog } from '@components/dashboard/create-project-dialog'
import { EmptyStateHero } from '@components/dashboard/empty-state-hero'
import { useMemo, useCallback, useState } from 'react'

// Componente de card de estatística reutilizável
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  trend,
  testId
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  loading?: boolean
  trend?: { value: number; positive: boolean }
  testId?: string
}) {
  return (
    <Card data-testid={testId} className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{value}</div>
              {trend && (
                <span className={`text-xs flex items-center ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`h-3 w-3 mr-0.5 ${!trend.positive && 'rotate-180'}`} />
                  {trend.value}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { stats, isLoading: statsLoading, isError: statsError } = useDashboardStats()
  const { projects, isLoading: projectsLoading } = useProjects({
    limit: 6,
    sortBy: 'updated_at',
    sortOrder: 'desc'
  })

  // Check for empty state
  const hasNoProjects = !statsLoading && stats?.totalProjects === 0 && !projectsLoading && projects.length === 0

  // Memoize mapped projects
  const mappedProjects = useMemo(() =>
    projects.map(p => ({
      id: p.id,
      title: p.name,
      thumbnail: p.thumbnail_url,
      updatedAt: new Date(p.updated_at),
      status: p.status as 'draft' | 'completed' | 'processing'
    })), [projects]
  )

  // Health badge component
  const getHealthBadge = useCallback((health: string | undefined) => {
    const config = {
      healthy: { className: 'bg-green-500', label: 'Saudável' },
      warning: { className: 'bg-yellow-500', label: 'Atenção' },
      error: { className: 'bg-red-500', label: 'Crítico' },
      default: { className: 'bg-gray-500', label: 'Desconhecido' }
    }
    const { className, label } = config[health as keyof typeof config] || config.default
    return <Badge className={className}>{label}</Badge>
  }, [])

  if (hasNoProjects) {
    return <EmptyStateHero />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header com ação principal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Bem-vindo de volta! Aqui está um resumo dos seus projetos.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/editor/ai-script/new'}
          >
            <Zap className="mr-2 h-4 w-4" />
            Novo Roteiro IA
          </Button>

          <Button
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/ai-features'}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI Features
          </Button>

          <Button
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/voice-cloning-advanced'}
          >
            <Mic className="mr-2 h-4 w-4" />
            Voice Clone
          </Button>

          <Button
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/auto-subtitles'}
          >
            <FileText className="mr-2 h-4 w-4" />
            Subtitles
          </Button>

          <Button
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/video-enhancement'}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Enhance
          </Button>

          <Button
            className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/scene-detection'}
          >
            <Scissors className="mr-2 h-4 w-4" />
            Scenes
          </Button>

          {/* Advanced Features */}
          <Button
            className="bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/batch-processing'}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Batch
          </Button>

          <Button
            className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/analytics'}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
          </Button>

          <Button
            className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/presets'}
          >
            <Bell className="mr-2 h-4 w-4" />
            Presets
          </Button>

          <Button
            className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/notifications'}
          >
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Button>

          <Button
            className="bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/history'}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            History
          </Button>

          <Button
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/api-keys'}
          >
            <Zap className="mr-2 h-4 w-4" />
            API Keys
          </Button>

          <Button
            className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/settings'}
          >
            <Bell className="mr-2 h-4 w-4" />
            Settings
          </Button>

          <Button
            className="bg-gradient-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/billing'}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Billing
          </Button>

          <Button
            className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/help'}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Help
          </Button>

          <Button
            className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/team'}
          >
            <Mic className="mr-2 h-4 w-4" />
            Team
          </Button>

          <Button
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/exports'}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Exports
          </Button>

          <Button
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/media'}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Media
          </Button>

          <Button
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/share'}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Share
          </Button>

          <Button
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/integrations'}
          >
            <Zap className="mr-2 h-4 w-4" />
            Integrations
          </Button>

          <Button
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/scheduling'}
          >
            <Bell className="mr-2 h-4 w-4" />
            Scheduling
          </Button>

          <Button
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/brand-kit'}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Brand Kit
          </Button>

          <Button
            className="bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/activity'}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Activity
          </Button>

          <Button
            className="bg-gradient-to-r from-gray-700 to-slate-800 hover:from-gray-800 hover:to-slate-900 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/shortcuts'}
          >
            <Play className="mr-2 h-4 w-4" />
            Shortcuts
          </Button>

          <Button
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/comments'}
          >
            <Bell className="mr-2 h-4 w-4" />
            Comments
          </Button>

          <Button
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/favorites'}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Favorites
          </Button>

          <Button
            className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg text-white border-0"
            onClick={() => window.location.href = '/trash'}
          >
            <Scissors className="mr-2 h-4 w-4" />
            Trash
          </Button>

          <Button
            id="create-project-btn-main"
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            onClick={() => {
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Projeto
          </Button>

          <CreateProjectDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          />
        </div>
      </div>
      {/* Erro de carregamento de stats */}
      {
        statsError && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Não foi possível carregar as estatísticas. Alguns dados podem estar desatualizados.
              </p>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )
      }

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          testId="dashboard-card-total-projects"
          title="Total de Projetos"
          value={stats?.totalProjects || 0}
          subtitle="Projetos ativos"
          icon={FolderOpen}
          loading={statsLoading}
        />

        <StatCard
          testId="dashboard-card-active-renders"
          title="Renders Ativos"
          value={stats?.activeRenders || 0}
          subtitle={`${stats?.completedToday || 0} concluídos hoje`}
          icon={Play}
          loading={statsLoading}
        />

        <StatCard
          testId="dashboard-card-total-views"
          title="Visualizações"
          value={stats?.totalViews || 0}
          subtitle="Em todos os projetos"
          icon={Zap}
          loading={statsLoading}
        />

        <StatCard
          testId="dashboard-card-avg-render-time"
          title="Tempo Médio de Render"
          value={`${stats?.avgRenderTime || 0}m`}
          subtitle="Últimos 10 jobs"
          icon={Bell}
          loading={statsLoading}
        />
      </div>

      {/* Conteúdo principal */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Projetos Recentes</CardTitle>
              <CardDescription>Seus últimos projetos de vídeo</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RecentProjects
              loading={projectsLoading}
              projects={mappedProjects}
            />
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>Saúde e performance atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Saúde Geral</span>
                {statsLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  getHealthBadge(stats?.systemHealth)
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Serviços de API</span>
                <Badge className="bg-green-500">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Banco de Dados</span>
                <Badge className="bg-green-500">Conectado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Fila de Render</span>
                <Badge className="bg-green-500">Ativa</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div >
  )
}
