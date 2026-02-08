'use client'
import { logger } from '@/lib/logger';

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { format, formatDistanceToNow, subDays, subHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Video,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Upload,
  Download,
  Eye,
  FileVideo,
  Zap,
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Bell,
  Settings,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Crown,
  Target,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  Share2,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  BarChart3,
  Layers,
  Film,
  Mic,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useProjects, type Project } from '@/hooks/use-projects'
import { useMetrics, type Metrics } from '@/hooks/use-metrics'
import { toast } from 'react-hot-toast'

// ============================================================================
// Types
// ============================================================================

interface KPICardProps {
  title: string
  value: string | number | React.ReactNode
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'cyan'
  href?: string
}

interface ActivityItem {
  id: string
  type: 'render_complete' | 'render_started' | 'upload' | 'error' | 'user_action' | 'system'
  title: string
  description: string
  timestamp: Date
  user?: { name: string; avatar?: string }
  projectId?: string
  projectName?: string
}

interface SystemStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  latency?: number
  load?: number
}

interface QuickAction {
  label: string
  icon: React.ReactNode
  href: string
  color: string
  description?: string
}

// Helper to map API activity types to component types
function mapApiTypeToActivityType(apiType: string): ActivityItem['type'] {
  const typeMap: Record<string, ActivityItem['type']> = {
    create: 'upload',
    edit: 'user_action',
    delete: 'error',
    share: 'user_action',
    export: 'render_complete',
    auth: 'system',
    settings: 'system',
    view: 'user_action',
  }
  return typeMap[apiType] || 'system'
}

// ============================================================================
// Constants
// ============================================================================

const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#22c55e',
  tertiary: '#f59e0b',
  quaternary: '#ec4899',
  muted: '#94a3b8',
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4']

// ============================================================================
// Sub-Components
// ============================================================================

/** KPI Card with animation and trend indicator */
function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = 'neutral',
  loading = false,
  color = 'blue',
  href,
}: KPICardProps) {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    rose: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
  }

  const iconColorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    rose: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
    cyan: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
  }

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden bg-gradient-to-br border transition-all duration-300',
          colorClasses[color],
          href && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn('p-2.5 rounded-xl', iconColorClasses[color])}>
            {icon}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <>
              <Skeleton className="h-9 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </>
          ) : (
            <>
              <motion.div
                className="text-3xl font-bold tracking-tight"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {value}
              </motion.div>

              {change !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  {trend === 'up' && (
                    <div className="flex items-center text-green-600 text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>+{change}%</span>
                    </div>
                  )}
                  {trend === 'down' && (
                    <div className="flex items-center text-red-500 text-sm font-medium">
                      <ArrowDownRight className="h-4 w-4" />
                      <span>{change}%</span>
                    </div>
                  )}
                  {changeLabel && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {changeLabel}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>

        {href && (
          <div className="absolute bottom-2 right-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}
      </Card>
    </motion.div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

/** Animated counter for numbers */
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(startValue + (value - startValue) * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <>{displayValue.toLocaleString('pt-BR')}</>
}

/** Activity Feed Item */
function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
  const typeConfig = {
    render_complete: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    render_started: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    upload: { icon: Upload, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    user_action: { icon: Users, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    system: { icon: Settings, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900/30' },
  }

  const config = typeConfig[activity.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className={cn('p-2 rounded-lg', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.title}</p>
        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
        {activity.projectName && (
          <Link
            href={`/dashboard/projects/${activity.projectId}`}
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            {activity.projectName}
          </Link>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
        </span>
        {activity.user && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={activity.user.avatar} />
            <AvatarFallback className="text-[10px]">
              {activity.user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </motion.div>
  )
}

/** System Status Indicator */
function SystemStatusCard({ systems }: { systems: SystemStatus[] }) {
  const getStatusColor = (status: SystemStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-amber-500'
      case 'down':
        return 'bg-red-500'
    }
  }

  const allOperational = systems.every((s) => s.status === 'operational')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Server className="h-4 w-4" />
            Status do Sistema
          </CardTitle>
          <Badge
            variant={allOperational ? 'default' : 'destructive'}
            className={cn(
              'text-xs',
              allOperational && 'bg-green-100 text-green-700 hover:bg-green-100'
            )}
          >
            {allOperational ? 'Operacional' : 'Problemas Detectados'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {systems.map((system) => (
          <div key={system.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', getStatusColor(system.status))} />
              <span className="text-sm">{system.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {system.latency && <span>{system.latency}ms</span>}
              {system.load && (
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        system.load < 50 ? 'bg-green-500' : system.load < 80 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${system.load}%` }}
                    />
                  </div>
                  <span>{system.load}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Quick Actions Panel */
function QuickActionsPanel({ actions }: { actions: QuickAction[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Link key={action.label} href={action.href}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'p-3 rounded-lg border transition-colors cursor-pointer',
                'hover:border-primary/30 hover:bg-primary/5'
              )}
            >
              <div className={cn('p-2 rounded-lg w-fit mb-2', action.color)}>
                {action.icon}
              </div>
              <p className="text-sm font-medium">{action.label}</p>
              {action.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              )}
            </motion.div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

/** Project Status Table */
function ProjectsTable({
  projects,
  loading,
  onAction,
}: {
  projects: Project[]
  loading: boolean
  onAction: (action: string, project: Project) => void
}) {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      completed: { label: 'Concluído', className: 'bg-green-100 text-green-700 border-green-200' },
      'in-progress': { label: 'Em Progresso', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-200' },
      error: { label: 'Erro', className: 'bg-red-100 text-red-700 border-red-200' },
      review: { label: 'Em Revisão', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      archived: { label: 'Arquivado', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    }

    const statusConfig = config[status] || config.draft
    return (
      <Badge variant="outline" className={cn('text-xs font-medium', statusConfig.className)}>
        {statusConfig.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FileVideo className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Nenhum projeto encontrado</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Crie seu primeiro projeto para começar
        </p>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Projeto</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duração</TableHead>
          <TableHead>Slides</TableHead>
          <TableHead>Atualizado</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id} className="group">
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-16 rounded bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                  {project.thumbnail_url ? (
                    <img
                      src={project.thumbnail_url}
                      alt={project.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileVideo className="h-5 w-5 text-primary/60" />
                  )}
                  {project.status === 'in-progress' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium truncate max-w-[180px]">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {project.description || 'Sem descrição'}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(project.status)}</TableCell>
            <TableCell>
              <span className="text-sm tabular-nums">
                {project.metadata?.estimated_duration
                  ? `${Math.floor(project.metadata.estimated_duration / 60)}:${(project.metadata.estimated_duration % 60)
                      .toString()
                      .padStart(2, '0')}`
                  : '--:--'}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm">{project.metadata?.tags?.length || 0} tags</span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {project.updated_at
                  ? formatDistanceToNow(new Date(project.updated_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : '-'}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAction('edit', project)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction('preview', project)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction('duplicate', project)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction('share', project)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onAction('delete', project)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ============================================================================
// Main Component
// ============================================================================

// Default fallback data when APIs are unavailable
const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'default-1',
    type: 'system',
    title: 'Sistema inicializado',
    description: 'Dashboard carregado com sucesso',
    timestamp: new Date(),
  },
]

const DEFAULT_SYSTEM_STATUS: SystemStatus[] = [
  { name: 'API Principal', status: 'operational', latency: 0 },
  { name: 'Banco de Dados', status: 'operational', latency: 0 },
  { name: 'Fila de Render', status: 'operational', load: 0 },
  { name: 'Storage (Supabase)', status: 'operational', latency: 0 },
  { name: 'TTS Service', status: 'operational', latency: 0 },
]

export function ProfessionalDashboard() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('week')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activities, setActivities] = useState<ActivityItem[]>(DEFAULT_ACTIVITIES)
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>(DEFAULT_SYSTEM_STATUS)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [systemLoading, setSystemLoading] = useState(true)

  // Data hooks
  const { projects, isLoading: projectsLoading, refresh: refreshProjects } = useProjects()
  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useMetrics(period)

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true)
    try {
      const response = await fetch('/api/activity?limit=10')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.length > 0) {
          // Map API response to ActivityItem format
          const mappedActivities: ActivityItem[] = result.data.map((item: {
            id: string
            type: string
            action: string
            description: string
            timestamp: string
            user?: string
            metadata?: { resourceType?: string; resourceId?: string }
          }) => ({
            id: item.id,
            type: mapApiTypeToActivityType(item.type),
            title: item.action,
            description: item.description,
            timestamp: new Date(item.timestamp),
            user: item.user ? { name: item.user } : undefined,
            projectId: item.metadata?.resourceId,
            projectName: item.metadata?.resourceType,
          }))
          setActivities(mappedActivities)
        }
      }
    } catch (error) {
      logger.error('Failed to fetch activities:', error)
      // Keep default activities on error
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  // Fetch system status from health API
  const fetchSystemStatus = useCallback(async () => {
    setSystemLoading(true)
    try {
      const response = await fetch('/api/health?full=true')
      if (response.ok) {
        const health = await response.json()
        if (health.checks) {
          // Map health checks to SystemStatus format
          const statusMap: Record<string, string> = {
            api_principal: 'API Principal',
            database: 'Banco de Dados',
            supabase: 'Banco de Dados',
            redis: 'Fila de Render',
            render_queue: 'Fila de Render',
            storage: 'Storage (Supabase)',
            supabase_storage: 'Storage (Supabase)',
            tts: 'TTS Service',
            elevenlabs: 'TTS Service',
          }
          
          const mappedStatus: SystemStatus[] = Object.entries(health.checks).map(
            ([key, value]: [string, unknown]) => {
              const check = value as { status?: string; latency?: number; load?: number }
              return {
                name: statusMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                status: check.status === 'healthy' || check.status === 'ok' 
                  ? 'operational' as const
                  : check.status === 'degraded' 
                    ? 'degraded' as const 
                    : 'down' as const,
                latency: check.latency,
                load: check.load,
              }
            }
          ).slice(0, 5) // Limit to 5 services
          
          if (mappedStatus.length > 0) {
            setSystemStatus(mappedStatus)
          }
        }
      }
    } catch (error) {
      logger.error('Failed to fetch system status:', error)
      // Keep default status on error
    } finally {
      setSystemLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    fetchActivities()
    fetchSystemStatus()
  }, [fetchActivities, fetchSystemStatus])

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        label: 'Novo Projeto',
        icon: <Plus className="h-4 w-4 text-blue-600" />,
        href: '/dashboard/projects/new',
        color: 'bg-blue-100 dark:bg-blue-900/30',
        description: 'Criar do zero',
      },
      {
        label: 'Importar PPTX',
        icon: <Upload className="h-4 w-4 text-purple-600" />,
        href: '/dashboard/upload',
        color: 'bg-purple-100 dark:bg-purple-900/30',
        description: 'De apresentação',
      },
      {
        label: 'Templates NR',
        icon: <Layers className="h-4 w-4 text-amber-600" />,
        href: '/dashboard/templates',
        color: 'bg-amber-100 dark:bg-amber-900/30',
        description: 'Usar template',
      },
      {
        label: 'Analytics',
        icon: <BarChart3 className="h-4 w-4 text-green-600" />,
        href: '/dashboard/analytics',
        color: 'bg-green-100 dark:bg-green-900/30',
        description: 'Ver métricas',
      },
    ],
    []
  )

  // Chart data
  const renderTrendData = useMemo(
    () => [
      { date: 'Seg', renders: 12, minutes: 45 },
      { date: 'Ter', renders: 19, minutes: 72 },
      { date: 'Qua', renders: 15, minutes: 58 },
      { date: 'Qui', renders: 25, minutes: 95 },
      { date: 'Sex', renders: 22, minutes: 84 },
      { date: 'Sáb', renders: 8, minutes: 32 },
      { date: 'Dom', renders: 5, minutes: 20 },
    ],
    []
  )

  const projectDistribution = useMemo(
    () => [
      { name: 'Concluídos', value: 45 },
      { name: 'Em Progresso', value: 25 },
      { name: 'Rascunhos', value: 20 },
      { name: 'Com Erros', value: 10 },
    ],
    []
  )

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refreshProjects(), 
        refreshMetrics(),
        fetchActivities(),
        fetchSystemStatus()
      ])
      toast.success('Dados atualizados!')
    } catch (error) {
      toast.error('Erro ao atualizar dados')
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshProjects, refreshMetrics, fetchActivities, fetchSystemStatus])

  // Project action handler
  const handleProjectAction = useCallback((action: string, project: Project) => {
    switch (action) {
      case 'edit':
        window.location.href = `/dashboard/editor?projectId=${project.id}`
        break
      case 'preview':
        window.location.href = `/dashboard/preview/${project.id}`
        break
      case 'duplicate':
        toast.success(`Duplicando "${project.name}"...`)
        break
      case 'share':
        toast.success('Link de compartilhamento copiado!')
        break
      case 'delete':
        toast.error(`Confirme exclusão de "${project.name}"`)
        break
    }
  }, [])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [projects, searchQuery])

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral da sua produção de vídeos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as typeof period)}
            >
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>

            <TooltipUI>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar dados</TooltipContent>
            </TooltipUI>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total de Projetos"
            value={metrics?.overview?.totalProjects ?? 0}
            change={12}
            changeLabel="vs mês anterior"
            trend="up"
            icon={<Video className="h-5 w-5" />}
            color="blue"
            loading={metricsLoading}
            href="/dashboard/browse"
          />
          <KPICard
            title="Tempo Médio de Processamento"
            value={`${metrics?.overview?.avgProcessingTime ?? 0}min`}
            change={-8}
            changeLabel="mais rápido"
            trend="up"
            icon={<Clock className="h-5 w-5" />}
            color="green"
            loading={metricsLoading}
          />
          <KPICard
            title="Taxa de Sucesso"
            value={`${metrics?.performance?.successRate ?? 98}%`}
            change={2}
            changeLabel="vs semana anterior"
            trend="up"
            icon={<Target className="h-5 w-5" />}
            color="amber"
            loading={metricsLoading}
          />
          <KPICard
            title="Duração Total (min)"
            value={<AnimatedCounter value={metrics?.overview?.totalDuration ?? 1250} />}
            change={24}
            changeLabel="este mês"
            trend="up"
            icon={<Film className="h-5 w-5" />}
            color="purple"
            loading={metricsLoading}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Render Trend Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Tendência de Renderização</CardTitle>
                    <CardDescription>Vídeos renderizados por dia</CardDescription>
                  </div>
                  <Tabs defaultValue="renders" className="h-8">
                    <TabsList className="h-8">
                      <TabsTrigger value="renders" className="text-xs px-2 h-6">
                        Renders
                      </TabsTrigger>
                      <TabsTrigger value="minutes" className="text-xs px-2 h-6">
                        Minutos
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={renderTrendData}>
                      <defs>
                        <linearGradient id="colorRenders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="renders"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        fill="url(#colorRenders)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Projects Table */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Projetos Recentes</CardTitle>
                    <CardDescription>
                      {filteredProjects.length} projetos encontrados
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar projetos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-[200px]"
                      />
                    </div>

                    <div className="flex border rounded-lg">
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-9 w-9 rounded-r-none"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-9 w-9 rounded-l-none"
                        onClick={() => setViewMode('grid')}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <ProjectsTable
                  projects={filteredProjects.slice(0, 5)}
                  loading={projectsLoading}
                  onAction={handleProjectAction}
                />
              </CardContent>

              <CardFooter className="border-t pt-4">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard/browse">
                    Ver todos os projetos
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActionsPanel actions={quickActions} />

            {/* Project Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Distribuição de Projetos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {projectDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                  {projectDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <SystemStatusCard systems={systemStatus} />

            {/* Activity Feed */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Atividade Recente
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver tudo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[320px]">
                  <div className="px-4 pb-4 space-y-1">
                    {activities.map((activity) => (
                      <ActivityFeedItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default ProfessionalDashboard
