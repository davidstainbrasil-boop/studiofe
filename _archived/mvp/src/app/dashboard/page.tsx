'use client';

import { useMetrics } from '@/hooks/use-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  Video,
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

function MetricCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

export default function DashboardPage() {
  const { metrics, recentProjects, recentActivity, isLoading, error } =
    useMetrics('30d');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            Erro ao carregar métricas: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Badge variant="outline">Últimos 30 dias</Badge>
      </div>

      {/* Metrics cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Projetos"
          value={metrics?.totalProjects ?? 0}
          icon={FolderOpen}
          description={`${metrics?.activeProjects ?? 0} ativos`}
        />
        <MetricCard
          title="Renders"
          value={metrics?.totalRenders ?? 0}
          icon={Video}
          description={`${metrics?.completedRenders ?? 0} concluídos`}
        />
        <MetricCard
          title="Taxa de Sucesso"
          value={`${metrics?.renderSuccessRate ?? 0}%`}
          icon={metrics?.renderSuccessRate && metrics.renderSuccessRate >= 80 ? CheckCircle : AlertTriangle}
        />
        <MetricCard
          title="Colaboradores"
          value={metrics?.totalCollaborators ?? 0}
          icon={Users}
        />
      </div>

      {/* Two columns: Recent Projects + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projetos Recentes</CardTitle>
            <Link
              href="/dashboard/projects"
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum projeto criado ainda.{' '}
                <Link href="/dashboard/projects" className="text-primary hover:underline">
                  Criar primeiro projeto
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project._count.slides} slides &middot;{' '}
                        {formatRelativeTime(new Date(project.updatedAt))}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={statusColors[project.status] || ''}
                    >
                      {project.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma atividade registrada.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {event.eventType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(event.createdAt))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
