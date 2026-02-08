
'use client'

import { useState, useEffect, useMemo } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UnifiedProject } from '@/lib/stores/unified-project-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Progress } from '../ui/progress'
import {
  Plus,
  FileVideo,
  Clock,
  Play,
  Download,
  Share2,
  Trash2,
  Settings,
  User,
  LogOut,
  BarChart3,
  Zap,
  Upload,
  BookOpen,
  Building,
  Database,
  TrendingUp,
  Activity,
  Film,
  Target,
  Sparkles,
  Star,
  Mic,
  Globe,
  Shield,
  Brain,
  Heart,
  Volume2,
  Smartphone,
  Crown,
  Workflow,
  Link2,
  RefreshCw,
  AlertCircle,
  CheckCircle,

  Eye,
  Edit
} from 'lucide-react'
import { useProjects, type Project } from '../../hooks/use-projects'
import { useMetrics } from '../../hooks/use-metrics'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { AnalyticsCharts } from './analytics-charts'

export default function DashboardReal() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('month')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Edit State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Real data hooks
  const { projects, isLoading: projectsLoading, error: projectsError, refresh: refreshProjects, updateProject } = useProjects(
    projectFilter === 'all' ? undefined : { status: projectFilter }
  )
  const { metrics, loading: metricsLoading, error: metricsError, refresh: refreshMetrics } = useMetrics(selectedPeriod)

  const handleSaveUpdate = async () => {
    if (!editingProject) return

    try {
      await updateProject(editingProject.id, {
        name: editingProject.name,
        description: editingProject.description,
        status: editingProject.status
      })
      setIsEditDialogOpen(false)
      toast.success('Projeto atualizado com sucesso')
      refreshProjects()
    } catch (error) {
      toast.error('Erro ao atualizar projeto')
    }
  }

  // 🚨 EMERGENCY: Removed auto-refresh to prevent infinite loops
  // Manual refresh only through user interaction

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!isMounted) return
        const authUser = data.user ?? null
        setUser(authUser)

        if (authUser) {
          const { data: profile, error } = await supabase
            .from('users')
            .select('name')
            .eq('id', authUser.id)
            .maybeSingle()

          if (!isMounted) return

          if (error) {
            logger.warn('Erro ao carregar perfil', { component: 'DashboardReal', error: error.message })
          }

          setDisplayName(profile?.name ?? authUser.user_metadata?.name ?? authUser.email ?? null)
        } else {
          setDisplayName(null)
        }
      } catch (error) {
        logger.error('Erro ao carregar sessão do usuário', error instanceof Error ? error : new Error(String(error)), { component: 'DashboardReal' })
        router.push('/login?reason=auth_error')
      }
    }

    void loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return
      const authUser = session?.user ?? null
      setUser(authUser)
      if (authUser) {
        setDisplayName(authUser.user_metadata?.name ?? authUser.email ?? null)
      } else {
        setDisplayName(null)
      }
    })

    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
    }
  }, [supabase])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído'
      case 'processing':
        return 'Processando'
      case 'draft':
        return 'Rascunho'
      case 'error':
        return 'Erro'
      default:
        return 'Desconhecido'
    }
  }

  const formatDuration = (seconds?: number) => {
    const s = seconds ?? 0
    const minutes = Math.floor(s / 60)
    const remainingSeconds = s % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleSignOut = async () => {
    if (signingOut) return
    try {
      setSigningOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      router.replace('/login?reason=session_expired')
      router.refresh()
    } catch (error) {
      logger.error('Erro ao fazer logout', error instanceof Error ? error : new Error(String(error)), { component: 'DashboardReal' })
      toast.error('Não foi possível encerrar a sessão. Tente novamente.')
    } finally {
      setSigningOut(false)
    }
  }

  const handleCreateProject = async () => {
    try {
      // Redirecionar para o PPTX Studio Enhanced - Hub principal
      router.push('/pptx')
    } catch (error) {
      toast.error('Erro ao criar projeto')
    }
  }

  const handleViewProject = async (projectId: string) => {
    try {
      router.push(`/studio-pro?projectId=${projectId}`)
    } catch (error) {
      toast.error('Erro ao abrir projeto')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Projeto excluído com sucesso')
        refreshProjects()
      } else {
        throw new Error('Falha ao excluir projeto')
      }
    } catch (error) {
      toast.error('Erro ao excluir projeto')
    }
  }

  const handleDownloadVideo = async (projectData: Project) => {
    const extendedProject = projectData as Project & { videoUrl?: string; downloads?: number }
    if (!extendedProject.videoUrl) {
      toast.error('Vídeo ainda não está pronto')
      return
    }

    try {
      // Increment download count
      await fetch(`/api/projects/${projectData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloads: (extendedProject.downloads || 0) + 1 })
      })

      // Trigger download
      const link = document.createElement('a')
      link.href = extendedProject.videoUrl
      link.download = `${projectData.name}.mp4`
      link.click()

      toast.success('Download iniciado')
      refreshProjects()
    } catch (error) {
      toast.error('Erro ao fazer download')
    }
  }

  if (projectsLoading || metricsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (projectsError || metricsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Erro ao carregar dados do dashboard</p>
          <Button onClick={() => { refreshProjects(); refreshMetrics() }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3 transition-transform hover:scale-105 duration-300">
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Estúdio IA de Vídeos
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-4">

                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/80 rounded-full border shadow-sm">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-1.5 rounded-full">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium pr-2">
                    {displayName ?? user?.email ?? 'Usuário'}
                  </span>
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { refreshProjects(); refreshMetrics() }}
                    title="Atualizar dados"
                    className="h-7 w-7 p-0 rounded-full hover:bg-blue-100/50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    title="Sair"
                    className="h-7 w-7 p-0 rounded-full hover:bg-red-100/50"
                    disabled={signingOut}
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-600">Dados em tempo real dos seus projetos</p>
            </div>

            <div className="flex gap-3">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  <SelectItem value="draft">Rascunhos</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="error">Com Erro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPeriod} onValueChange={(value: 'day' | 'week' | 'month' | 'quarter') => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Hoje</SelectItem>
                  <SelectItem value="week">7 dias</SelectItem>
                  <SelectItem value="month">30 dias</SelectItem>
                  <SelectItem value="quarter">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Real Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-md transition-shadow duration-300 border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de Projetos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-800">{metrics?.overview?.totalProjects ?? 0}</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                    <FileVideo className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-300 border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Vídeos Concluídos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-800">{metrics?.overview?.completedProjects ?? 0}</span>
                  <div className="p-2 bg-green-50 text-green-600 rounded-full">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1">
                  <span className="block h-1.5 w-1.5 rounded-full bg-green-500"></span>
                  Sucesso: {metrics?.performance?.successRate ?? 0}%
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-300 border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tempo Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-800">{Math.floor((metrics?.overview?.totalDuration ?? 0) / 60)}</span>
                  <span className="text-sm text-gray-500 font-medium self-end mb-1.5">min</span>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-full ml-auto">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium">
                  Média: {metrics?.performance?.avgProcessingTime ?? 0}s / vídeo
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-300 border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Engajamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-800">{metrics?.overview?.totalViews ?? 0}</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-full ml-auto">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium">
                  {metrics?.overview?.totalDownloads ?? 0} Downloads totais
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Cache Hit Rate</p>
                    <p className="text-xl font-bold text-blue-600">
                      {(metrics?.performance?.cacheHitRate ?? 0).toFixed(1)}%
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">Otimizado</span>
                    </div>
                  </div>
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Tempo Médio Processo</p>
                    <p className="text-xl font-bold text-green-600">
                      {metrics?.performance?.avgProcessingTime ?? 0}s
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Activity className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">Real-time</span>
                    </div>
                  </div>
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Em Processamento</p>
                    <p className="text-xl font-bold text-purple-600">
                      {metrics?.overview?.processingProjects ?? 0}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Zap className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-purple-500">Ativo</span>
                    </div>
                  </div>
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Studio Pro - HUB PROFISSIONAL */}
            <Link href="/studio-pro" className="contents">
              <Button
                variant="outline"
                className="p-6 h-auto flex-col gap-3 hover:bg-gradient-to-br hover:from-purple-50 hover:to-blue-50 hover:border-purple-300 border-none shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group bg-white"
              >
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold tracking-wide z-10">
                  NOVO
                </div>
                <div className="p-3 bg-purple-50 rounded-full group-hover:bg-white transition-colors">
                  <Workflow className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-800 group-hover:text-purple-700">Unified Studio</p>
                  <p className="text-xs text-gray-500">Produção Completa</p>
                </div>
              </Button>
            </Link>

            {/* PPTX Studio Enhanced - HUB PRINCIPAL */}
            <Link href="/pptx-preview" className="contents">
              <Button
                variant="outline"
                className="p-6 h-auto flex-col gap-3 hover:bg-purple-50/50 border-none shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group bg-white"
              >
                <div className="p-3 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
                  {/* Using existing placeholder or icon if available in original code logic, inferred here */}
                  <FileVideo className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">PPTX Studio</p>
                  <p className="text-xs text-gray-500">Editor e IA Integrada</p>
                </div>
              </Button>
            </Link>

            {/* Talking Photo Pro */}
            <Link href="/talking-photo-pro" className="contents">
              <Button
                variant="outline"
                className="p-6 h-auto flex-col gap-3 hover:bg-blue-50/50 border-none shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group bg-white"
              >
                <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Heart className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Talking Photo</p>
                  <p className="text-xs text-gray-500">Avatares e Voz</p>
                </div>
              </Button>
            </Link>

            {/* PPTX Upload Real */}
            <Link href="/pptx" className="contents">
              <Button
                variant="outline"
                className="p-6 h-auto flex-col gap-3 hover:bg-emerald-50/50 border-none shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group bg-white"
              >
                <div className="p-3 bg-emerald-50 rounded-full group-hover:bg-emerald-100 transition-colors">
                  <Upload className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Importar PPTX</p>
                  <p className="text-xs text-gray-500">Conversão de slides</p>
                </div>
              </Button>
            </Link>

            {/* Editor Visual Studio Pro */}
            <Link href="/studio-pro" className="contents">
              <Button
                variant="outline"
                className="p-6 h-auto flex-col gap-3 hover:bg-orange-50/50 border-none shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group bg-white"
              >
                <div className="p-3 bg-orange-50 rounded-full group-hover:bg-orange-100 transition-colors">
                  <Play className="w-8 h-8 text-orange-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Editor Visual</p>
                  <p className="text-xs text-gray-500">Edição manual</p>
                </div>
              </Button>
            </Link>

            {/* Professional Render Engine */}
            <Link href="/render-engine" className="contents">
              <Button
                variant="outline"
                className="p-6 h-auto flex-col gap-3 hover:bg-purple-50/50 border-none shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group bg-white"
              >
                <div className="p-3 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
                  <Film className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Render Engine</p>
                  <p className="text-xs text-gray-500">Exportação de vídeo</p>
                </div>
              </Button>
            </Link>
          </div>

          {/* Analytics Charts Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Analytics
              </h2>
              <Badge variant="outline" className="text-xs">
                {selectedPeriod === 'day' ? 'Hoje' : selectedPeriod === 'week' ? 'Última Semana' : selectedPeriod === 'month' ? 'Último Mês' : 'Último Trimestre'}
              </Badge>
            </div>
            <AnalyticsCharts period={selectedPeriod} />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Projetos Recentes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/projects')}
              >
                Ver Todos ({(projects || []).length})
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(projects || []).slice(0, 6).map((project: Project) => {
                const p = project as Project & { slidesCount?: number; duration?: number; thumbnailUrl?: string; views?: number; downloads?: number; createdAt?: string }
                return (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-2">
                            {project.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {p.slidesCount} slides • {formatDuration(p.duration)}
                          </CardDescription>
                        </div>
                        <Badge className={`ml-2 ${getStatusColor(p.status)}`}>
                          {getStatusText(p.status)}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
                            alt={project.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <FileVideo className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mb-2">
                        Criado em {p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </div>

                      <div className="text-xs text-gray-500 mb-4 flex gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {p.views} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {p.downloads} downloads
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.status === 'completed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewProject(project.id)}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Visualizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadVideo(project)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </>
                        )}

                        {p.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleViewProject(project.id)}
                          >
                            Continuar Edição
                          </Button>
                        )}

                        {p.status === 'in-progress' && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Processando...
                          </div>
                        )}

                        {p.status === 'error' && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            Erro no processamento
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto mr-1"
                          onClick={() => {
                            setEditingProject(project)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {(!projects || projects.length === 0) && (
              <Card className="p-12 text-center">
                <FileVideo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum projeto ainda</h3>
                <p className="text-gray-600 mb-6">
                  Crie seu primeiro vídeo de treinamento com IA
                </p>
                <Button onClick={handleCreateProject}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Projeto
                </Button>
              </Card>
            )}
          </div>
        </main>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <CardDescription>
                Atualize os detalhes do projeto
              </CardDescription>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-project-name">Nome do Projeto</Label>
                  <Input
                    id="edit-project-name"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-project-description">Descrição</Label>
                  <Textarea
                    id="edit-project-description"
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-project-status">Status</Label>
                  <Select
                    value={editingProject.status}
                    onValueChange={(value) => setEditingProject({ ...editingProject, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="in-progress">Em Andamento</SelectItem>
                      <SelectItem value="review">Revisão</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUpdate}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
