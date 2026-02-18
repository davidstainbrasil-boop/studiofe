'use client';

import { useMetrics } from '@/hooks/use-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { ProjectsByDayChart, RendersByStatusChart } from '@/components/dashboard/charts';

type Period = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const { metrics, charts, isLoading, error } = useMetrics(period);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
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
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1 bg-muted p-1 rounded-md">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.totalProjects ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.activeProjects ?? 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Renders Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.totalRenders ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.completedRenders ?? 0} concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.renderSuccessRate ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.failedRenders ?? 0} com falha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.totalCollaborators ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projetos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsByDayChart data={charts?.projectsByDay ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Renders por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <RendersByStatusChart data={charts?.rendersByStatus ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
