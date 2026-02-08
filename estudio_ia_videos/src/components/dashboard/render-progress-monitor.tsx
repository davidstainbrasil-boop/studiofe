'use client';
import { logger } from '@/lib/logger';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useRenderPipeline } from '../../hooks/use-render-pipeline';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentJob {
  id: string;
  projectName: string;
  status: 'completed' | 'failed' | 'cancelled';
  completedAt: Date;
}

export function RenderProgressMonitor() {
  const { renderQueue } = useRenderPipeline();
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  
  const activeJob = renderQueue?.processing?.[0];
  const isRendering = !!activeJob;
  
  const progress = activeJob ? {
    jobId: activeJob.id,
    progress: activeJob.progress,
    status: activeJob.status
  } : null;

  // Fetch recent completed/failed jobs from API
  const fetchRecentJobs = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const response = await fetch('/api/render/jobs?status=completed,failed&limit=5');
      if (response.ok) {
        const data = await response.json();
        if (data.jobs && Array.isArray(data.jobs)) {
          const mapped: RecentJob[] = data.jobs.map((job: {
            id: string;
            projectId?: string;
            name?: string;
            status: string;
            updatedAt?: string;
            completedAt?: string;
            createdAt: string;
          }) => ({
            id: job.id,
            projectName: job.name || `Projeto ${job.projectId?.slice(0, 8) || 'N/A'}`,
            status: job.status as RecentJob['status'],
            completedAt: new Date(job.completedAt || job.updatedAt || job.createdAt),
          }));
          setRecentJobs(mapped);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch recent jobs:', error);
      // Keep empty on error
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentJobs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchRecentJobs]);

  const getStatusIcon = (status: RecentJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: RecentJob['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600">Concluído</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600">Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-amber-600">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Monitor de Renderização
        </CardTitle>
        <CardDescription>
          Acompanhe o progresso das renderizações em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-4">
            {isRendering && progress ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                    <span className="font-medium">Job: {progress.jobId}</span>
                  </div>
                  <Badge variant="default">Em Progresso</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{progress.progress}%</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Status: {progress.status}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Tempo estimado restante: {Math.round((100 - progress.progress) / 10)} min</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma renderização ativa</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Todas as tarefas foram concluídas
                </p>
              </div>
            )}
            
            {/* Recent completed jobs from API */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Trabalhos Recentes</h4>
              
              {loadingRecent ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="text-sm font-medium">{job.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(job.completedAt, { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum trabalho recente encontrado
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}