'use client';

/**
 * 📊 Analytics Charts Component
 * Charts interativos para métricas de vídeos NR
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Clock,
  Video,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================
interface AnalyticsData {
  production: ProductionMetric[];
  performance: PerformanceMetric[];
  categories: CategoryMetric[];
  trends: TrendMetric[];
}

interface ProductionMetric {
  date: string;
  videos: number;
  duration: number;
  completed: number;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
}

interface CategoryMetric {
  name: string;
  value: number;
  color: string;
}

interface TrendMetric {
  period: string;
  views: number;
  downloads: number;
  engagement: number;
}

interface AnalyticsChartsProps {
  data?: Partial<AnalyticsData>;
  period?: 'day' | 'week' | 'month' | 'quarter';
}

// ============================================================================
// Demo Data Generator
// ============================================================================
function generateDemoData(period: string): AnalyticsData {
  const days = period === 'day' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 90;
  
  const production: ProductionMetric[] = Array.from({ length: Math.min(days, 12) }, (_, i) => ({
    date: period === 'day' 
      ? `${i * 2}:00` 
      : period === 'week' 
        ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i % 7]
        : `${i + 1}/${new Date().getMonth() + 1}`,
    videos: Math.floor(Math.random() * 10) + 1,
    duration: Math.floor(Math.random() * 60) + 10,
    completed: Math.floor(Math.random() * 8) + 1,
  }));

  const performance: PerformanceMetric[] = [
    { metric: 'Taxa de Sucesso', value: 94.5, target: 95, trend: 'up' },
    { metric: 'Tempo Médio Render', value: 45, target: 60, trend: 'down' },
    { metric: 'Qualidade HD', value: 98.2, target: 95, trend: 'up' },
    { metric: 'Uso de Cache', value: 78.4, target: 80, trend: 'up' },
  ];

  const categories: CategoryMetric[] = [
    { name: 'NR-35 Altura', value: 32, color: '#8b5cf6' },
    { name: 'NR-12 Máquinas', value: 24, color: '#3b82f6' },
    { name: 'NR-10 Elétrica', value: 18, color: '#10b981' },
    { name: 'NR-06 EPIs', value: 14, color: '#f59e0b' },
    { name: 'Outros', value: 12, color: '#6b7280' },
  ];

  const trends: TrendMetric[] = Array.from({ length: 6 }, (_, i) => ({
    period: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'][i],
    views: Math.floor(Math.random() * 1000) + 500,
    downloads: Math.floor(Math.random() * 200) + 50,
    engagement: Math.floor(Math.random() * 30) + 60,
  }));

  return { production, performance, categories, trends };
}

// ============================================================================
// Chart Colors
// ============================================================================
const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280',
};

// ============================================================================
// Main Component
// ============================================================================
export function AnalyticsCharts({ data, period = 'month' }: AnalyticsChartsProps) {
  const chartData = useMemo(() => {
    if (data?.production && data?.performance && data?.categories && data?.trends) {
      return data as AnalyticsData;
    }
    return generateDemoData(period);
  }, [data, period]);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {chartData.performance.map((metric) => (
          <Card key={metric.metric}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.metric}</p>
                  <p className="text-2xl font-bold">
                    {metric.metric.includes('Tempo') ? `${metric.value}s` : `${metric.value}%`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : metric.trend === 'down' && metric.metric.includes('Tempo') ? (
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  ) : (
                    <Activity className="h-5 w-5 text-blue-500" />
                  )}
                  <Badge variant={metric.value >= metric.target ? 'default' : 'secondary'} className="text-xs">
                    Meta: {metric.target}{metric.metric.includes('Tempo') ? 's' : '%'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="production" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Produção</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Tendências</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="engagement" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Engajamento</span>
          </TabsTrigger>
        </TabsList>

        {/* Production Chart */}
        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Produção de Vídeos
              </CardTitle>
              <CardDescription>
                Vídeos criados e tempo de duração por período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.production}>
                    <defs>
                      <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="videos"
                      name="Vídeos Criados"
                      stroke={CHART_COLORS.primary}
                      fill="url(#colorVideos)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Concluídos"
                      stroke={CHART_COLORS.success}
                      fill="url(#colorCompleted)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Chart */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendências de Visualização
              </CardTitle>
              <CardDescription>
                Views, downloads e engajamento ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData.trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="views"
                      name="Visualizações"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.primary }}
                    />
                    <Line
                      type="monotone"
                      dataKey="downloads"
                      name="Downloads"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.secondary }}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      name="Engajamento %"
                      stroke={CHART_COLORS.success}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.success }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Chart */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuição por Categoria NR
              </CardTitle>
              <CardDescription>
                Porcentagem de vídeos por norma regulamentadora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {chartData.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Chart */}
        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Métricas de Engajamento
              </CardTitle>
              <CardDescription>
                Comparativo de métricas por período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="views" name="Views" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="downloads" name="Downloads" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Video className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Produzido</p>
                <p className="text-xl font-bold">
                  {chartData.production.reduce((acc, item) => acc + item.videos, 0)} vídeos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duração Total</p>
                <p className="text-xl font-bold">
                  {Math.floor(chartData.production.reduce((acc, item) => acc + item.duration, 0) / 60)}h {chartData.production.reduce((acc, item) => acc + item.duration, 0) % 60}min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                <p className="text-xl font-bold">
                  {Math.round(
                    (chartData.production.reduce((acc, item) => acc + item.completed, 0) /
                      chartData.production.reduce((acc, item) => acc + item.videos, 0)) *
                      100
                  )}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
