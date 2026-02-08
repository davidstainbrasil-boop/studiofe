'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  X,
  MoreVertical,
  Clock,
  HardDrive,
  Cpu,
  Download,
  RefreshCw,
  Trash2,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListOrdered,
  ChevronUp,
  ChevronDown,
  Bell,
  BellOff,
  Settings,
  Upload,
  Share2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type RenderStatus = 
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

type RenderPriority = 'low' | 'normal' | 'high' | 'urgent';

interface RenderJob {
  id: string;
  projectId: string;
  projectName: string;
  status: RenderStatus;
  priority: RenderPriority;
  progress: number;
  currentPhase: string;
  estimatedTimeRemaining: number | null; // seconds
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  settings: {
    format: string;
    resolution: string;
    quality: string;
    duration: number; // seconds
    fileSize: number | null; // bytes
  };
  outputUrl: string | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
}

interface RenderQueueStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageRenderTime: number; // seconds
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskSpace: number; // percentage available
}

interface RenderQueuePanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_JOBS: RenderJob[] = [
  {
    id: 'job-1',
    projectId: 'proj-1',
    projectName: 'NR-12 Segurança em Máquinas',
    status: 'processing',
    priority: 'high',
    progress: 67,
    currentPhase: 'Codificando vídeo...',
    estimatedTimeRemaining: 180,
    startedAt: new Date(Date.now() - 300000),
    completedAt: null,
    createdAt: new Date(Date.now() - 360000),
    settings: {
      format: 'MP4',
      resolution: '1920x1080',
      quality: 'Alta',
      duration: 1800,
      fileSize: null,
    },
    outputUrl: null,
    error: null,
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'job-2',
    projectId: 'proj-2',
    projectName: 'NR-35 Trabalho em Altura',
    status: 'queued',
    priority: 'normal',
    progress: 0,
    currentPhase: 'Aguardando na fila...',
    estimatedTimeRemaining: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(Date.now() - 120000),
    settings: {
      format: 'MP4',
      resolution: '1920x1080',
      quality: 'Média',
      duration: 2400,
      fileSize: null,
    },
    outputUrl: null,
    error: null,
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'job-3',
    projectId: 'proj-3',
    projectName: 'NR-10 Eletricidade',
    status: 'completed',
    priority: 'normal',
    progress: 100,
    currentPhase: 'Concluído',
    estimatedTimeRemaining: null,
    startedAt: new Date(Date.now() - 7200000),
    completedAt: new Date(Date.now() - 3600000),
    createdAt: new Date(Date.now() - 7800000),
    settings: {
      format: 'MP4',
      resolution: '1920x1080',
      quality: 'Alta',
      duration: 3600,
      fileSize: 524288000, // 500MB
    },
    outputUrl: 'https://storage.example.com/videos/nr10-final.mp4',
    error: null,
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'job-4',
    projectId: 'proj-4',
    projectName: 'NR-06 EPIs',
    status: 'failed',
    priority: 'low',
    progress: 45,
    currentPhase: 'Falha na codificação',
    estimatedTimeRemaining: null,
    startedAt: new Date(Date.now() - 1800000),
    completedAt: null,
    createdAt: new Date(Date.now() - 2400000),
    settings: {
      format: 'WebM',
      resolution: '3840x2160',
      quality: 'Máxima',
      duration: 1200,
      fileSize: null,
    },
    outputUrl: null,
    error: 'Memória insuficiente para renderização 4K',
    retryCount: 2,
    maxRetries: 3,
  },
  {
    id: 'job-5',
    projectId: 'proj-5',
    projectName: 'NR-33 Espaços Confinados',
    status: 'queued',
    priority: 'urgent',
    progress: 0,
    currentPhase: 'Aguardando na fila...',
    estimatedTimeRemaining: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(Date.now() - 60000),
    settings: {
      format: 'MP4',
      resolution: '1280x720',
      quality: 'Média',
      duration: 900,
      fileSize: null,
    },
    outputUrl: null,
    error: null,
    retryCount: 0,
    maxRetries: 3,
  },
];

const MOCK_STATS: RenderQueueStats = {
  totalJobs: 5,
  queuedJobs: 2,
  processingJobs: 1,
  completedJobs: 1,
  failedJobs: 1,
  averageRenderTime: 1800,
  cpuUsage: 78,
  memoryUsage: 65,
  diskSpace: 42,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: RenderStatus }) {
  const config = {
    queued: { label: 'Na fila', variant: 'secondary' as const, icon: Clock },
    processing: { label: 'Processando', variant: 'default' as const, icon: Loader2 },
    completed: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle2 },
    failed: { label: 'Falhou', variant: 'destructive' as const, icon: AlertCircle },
    cancelled: { label: 'Cancelado', variant: 'secondary' as const, icon: X },
    paused: { label: 'Pausado', variant: 'secondary' as const, icon: Pause },
  }[status];

  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'gap-1',
        status === 'completed' && 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
        status === 'processing' && 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: RenderPriority }) {
  const config = {
    low: { label: 'Baixa', className: 'bg-slate-500/20 text-slate-400' },
    normal: { label: 'Normal', className: 'bg-blue-500/20 text-blue-400' },
    high: { label: 'Alta', className: 'bg-orange-500/20 text-orange-400' },
    urgent: { label: 'Urgente', className: 'bg-red-500/20 text-red-400' },
  }[priority];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

interface JobCardProps {
  job: RenderJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onChangePriority: (id: string, priority: RenderPriority) => void;
  onDownload: (id: string) => void;
  onOpenFolder: (id: string) => void;
}

function JobCard({
  job,
  onCancel,
  onRetry,
  onPause,
  onResume,
  onRemove,
  onChangePriority,
  onDownload,
  onOpenFolder,
}: JobCardProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-white truncate">{job.projectName}</h4>
              <StatusBadge status={job.status} />
              <PriorityBadge priority={job.priority} />
            </div>
            
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
              <span>{job.settings.format}</span>
              <span>•</span>
              <span>{job.settings.resolution}</span>
              <span>•</span>
              <span>{job.settings.quality}</span>
              <span>•</span>
              <span>{formatTime(job.settings.duration)}</span>
            </div>

            {/* Progress */}
            {(job.status === 'processing' || job.status === 'paused') && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{job.currentPhase}</span>
                  <span className="text-white font-medium">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-1.5" />
                {job.estimatedTimeRemaining && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>~{formatTime(job.estimatedTimeRemaining)} restantes</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {job.status === 'failed' && job.error && (
              <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{job.error}</p>
                {job.retryCount < job.maxRetries && (
                  <p className="text-xs text-slate-500 mt-1">
                    Tentativas: {job.retryCount}/{job.maxRetries}
                  </p>
                )}
              </div>
            )}

            {/* Completed Info */}
            {job.status === 'completed' && (
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                {job.settings.fileSize && (
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatFileSize(job.settings.fileSize)}</span>
                  </div>
                )}
                {job.completedAt && (
                  <span>Concluído {formatTimeAgo(job.completedAt)}</span>
                )}
              </div>
            )}

            {/* Queued Info */}
            {job.status === 'queued' && (
              <div className="text-xs text-slate-500 mt-1">
                Adicionado {formatTimeAgo(job.createdAt)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Quick Actions */}
            {job.status === 'processing' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPause(job.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Pausar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {job.status === 'paused' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onResume(job.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Retomar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {job.status === 'completed' && job.outputUrl && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDownload(job.id)}
                      className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {job.status === 'failed' && job.retryCount < job.maxRetries && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRetry(job.id)}
                      className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tentar novamente</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {job.status === 'queued' && (
                  <>
                    <DropdownMenuItem onClick={() => onChangePriority(job.id, 'urgent')}>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Prioridade urgente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangePriority(job.id, 'high')}>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Prioridade alta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangePriority(job.id, 'low')}>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Prioridade baixa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {job.status === 'completed' && (
                  <>
                    <DropdownMenuItem onClick={() => onDownload(job.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpenFolder(job.id)}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Abrir pasta
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar link
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload para nuvem
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {(job.status === 'processing' || job.status === 'queued') && (
                  <DropdownMenuItem 
                    onClick={() => onCancel(job.id)}
                    className="text-red-400"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem 
                  onClick={() => onRemove(job.id)}
                  className="text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover da lista
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStats({ stats }: { stats: RenderQueueStats }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-slate-400">CPU</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={stats.cpuUsage} className="h-1.5 flex-1" />
          <span className="text-xs font-medium text-white">{stats.cpuUsage}%</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="h-4 w-4 text-purple-400" />
          <span className="text-xs text-slate-400">Memória</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={stats.memoryUsage} className="h-1.5 flex-1" />
          <span className="text-xs font-medium text-white">{stats.memoryUsage}%</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="h-4 w-4 text-green-400" />
          <span className="text-xs text-slate-400">Disco livre</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={stats.diskSpace} className="h-1.5 flex-1" />
          <span className="text-xs font-medium text-white">{stats.diskSpace}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RenderQueuePanel({
  isOpen = true,
  onClose,
  className,
}: RenderQueuePanelProps) {
  const [jobs, setJobs] = useState<RenderJob[]>(MOCK_JOBS);
  const [stats, setStats] = useState<RenderQueueStats>(MOCK_STATS);
  const [filter, setFilter] = useState<RenderStatus | 'all'>('all');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simulate progress updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.status === 'processing' && job.progress < 100) {
          const newProgress = Math.min(job.progress + Math.random() * 2, 100);
          const newEstimate = job.estimatedTimeRemaining 
            ? Math.max(0, job.estimatedTimeRemaining - 1)
            : null;
          
          return {
            ...job,
            progress: Math.round(newProgress),
            estimatedTimeRemaining: newEstimate,
            status: newProgress >= 100 ? 'completed' : 'processing',
            completedAt: newProgress >= 100 ? new Date() : null,
            currentPhase: newProgress >= 100 ? 'Concluído' : job.currentPhase,
          } as RenderJob;
        }
        return job;
      }));

      // Update stats
      setStats(prev => ({
        ...prev,
        cpuUsage: Math.min(100, Math.max(0, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.min(100, Math.max(0, prev.memoryUsage + (Math.random() - 0.5) * 5)),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleCancel = useCallback((id: string) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, status: 'cancelled' as RenderStatus } : job
    ));
  }, []);

  const handleRetry = useCallback((id: string) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { 
        ...job, 
        status: 'queued' as RenderStatus, 
        progress: 0,
        error: null,
        retryCount: job.retryCount + 1,
        currentPhase: 'Aguardando na fila...',
      } : job
    ));
  }, []);

  const handlePause = useCallback((id: string) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, status: 'paused' as RenderStatus } : job
    ));
  }, []);

  const handleResume = useCallback((id: string) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, status: 'processing' as RenderStatus } : job
    ));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
  }, []);

  const handleChangePriority = useCallback((id: string, priority: RenderPriority) => {
    setJobs(prev => prev.map(job => 
      job.id === id ? { ...job, priority } : job
    ));
  }, []);

  const handleDownload = useCallback((id: string) => {
    const job = jobs.find(j => j.id === id);
    if (job?.outputUrl) {
      window.open(job.outputUrl, '_blank');
    }
  }, [jobs]);

  const handleOpenFolder = useCallback((id: string) => {
    logger.info('Open folder for job:', id);
  }, []);

  const handleClearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'completed'));
  }, []);

  const handleClearAll = useCallback(() => {
    setJobs([]);
  }, []);

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === filter);

  // Sort by priority (urgent first) then by creation date
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    if (a.status === 'processing' && b.status !== 'processing') return -1;
    if (b.status === 'processing' && a.status !== 'processing') return 1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const queuedCount = jobs.filter(j => j.status === 'queued').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;

  if (!isOpen) return null;

  return (
    <Card className={cn('bg-slate-900 border-slate-700 w-full max-w-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              Fila de Renderização
            </CardTitle>
            <CardDescription>
              {processingCount} processando • {queuedCount} na fila • {completedCount} concluídos
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className="h-8 w-8 p-0"
                  >
                    {notificationsEnabled ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {notificationsEnabled ? 'Desativar notificações' : 'Ativar notificações'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={cn('h-8 w-8 p-0', autoRefresh && 'text-green-400')}
                  >
                    <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? 'Pausar atualização' : 'Retomar atualização'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleClearCompleted}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Limpar concluídos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearAll} className="text-red-400">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar tudo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* System Stats */}
        <SystemStats stats={stats} />

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'processing', label: 'Ativos' },
            { value: 'queued', label: 'Na fila' },
            { value: 'completed', label: 'Concluídos' },
            { value: 'failed', label: 'Falhas' },
          ].map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant="ghost"
              onClick={() => setFilter(value as RenderStatus | 'all')}
              className={cn(
                'flex-1 h-7 text-xs',
                filter === value && 'bg-slate-700 text-white'
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Jobs List */}
        <ScrollArea className="h-[400px] pr-2">
          <div className="space-y-2">
            {sortedJobs.length > 0 ? (
              sortedJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onCancel={handleCancel}
                  onRetry={handleRetry}
                  onPause={handlePause}
                  onResume={handleResume}
                  onRemove={handleRemove}
                  onChangePriority={handleChangePriority}
                  onDownload={handleDownload}
                  onOpenFolder={handleOpenFolder}
                />
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum job na fila</p>
                <p className="text-xs mt-1">
                  Exporte um projeto para iniciar a renderização
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Summary Footer */}
        <div className="pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Tempo médio: {formatTime(stats.averageRenderTime)}
            </span>
            <span>
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} total
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RenderQueuePanel;
