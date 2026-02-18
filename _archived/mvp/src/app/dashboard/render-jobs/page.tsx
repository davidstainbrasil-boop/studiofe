'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  ExternalLink,
} from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RenderJob {
  id: string;
  status: string;
  progress: number;
  outputUrl: string | null;
  errorMsg: string | null;
  priority: number;
  startedAt: string | null;
  createdAt: string;
  completedAt: string | null;
  project: { id: string; name: string };
}

interface Summary {
  total: number;
  completed: number;
  failed: number;
  processing: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pendente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  queued: { label: 'Na Fila', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  processing: { label: 'Processando', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '—';
  const seconds = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function RenderJobsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (statusFilter !== 'all') params.set('status', statusFilter);

  const { data, isLoading, error } = useSWR(
    `/api/render/jobs?${params.toString()}`,
    fetcher,
    { refreshInterval: 10_000, revalidateOnFocus: true }
  );

  const jobs: RenderJob[] = data?.data ?? [];
  const summary: Summary = data?.summary ?? { total: 0, completed: 0, failed: 0, processing: 0 };
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Render Jobs</h1>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Render Jobs</h1>
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            Erro ao carregar render jobs.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Render Jobs</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open('/api/export/render-jobs', '_blank');
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="queued">Na Fila</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Video className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{summary.completed}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{summary.processing}</p>
              <p className="text-xs text-muted-foreground">Processando</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{summary.failed}</p>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum render job encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Inicie uma renderização a partir de um projeto.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {meta.total} {meta.total === 1 ? 'job' : 'jobs'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const config = statusConfig[job.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/projects/${job.project.id}`}
                          className="font-medium hover:underline text-primary"
                        >
                          {job.project.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={config.color}>
                          <StatusIcon className={`mr-1 h-3 w-3 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.status === 'processing' ? (
                          <div className="flex items-center gap-2">
                            <Progress value={job.progress} className="h-2 w-24" />
                            <span className="text-xs text-muted-foreground">
                              {job.progress}%
                            </span>
                          </div>
                        ) : job.status === 'completed' ? (
                          <span className="text-xs text-green-600">100%</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(job.startedAt, job.completedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(new Date(job.createdAt))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {job.outputUrl && (
                            <Button variant="ghost" size="icon" asChild>
                              <a
                                href={job.outputUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download vídeo"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={`/dashboard/projects/${job.project.id}`}
                              title="Ver projeto"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-3">
            Página {page} de {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
