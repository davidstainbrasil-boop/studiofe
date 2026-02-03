'use client';

/**
 * 📊 Analytics Charts Component
 * Charts interativos para métricas de vídeos NR
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
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
  RefreshCw,
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
import { logger } from '@lib/logger';
import { Button } from '@/components/ui/button';

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

interface DashboardApiResponse {
  overview: {
    totalEvents: number;
    eventsLast7Days: number;
    errorEvents: number;
    errorRate: number;
    activeUsers: number;
    totalProjects: number;
  };
  eventsByCategory: Array<{ category: string; count: number; percentage: string }>;
  timelineData: Array<{ date: string; events: number; errors: number; users: number }>;
  performanceMetrics: {
    avgLoadTime: number;
    avgRenderTime: number;
    avgProcessingTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number; calls: number }>;
  };
}

interface AnalyticsChartsProps {
  data?: Partial<AnalyticsData>;
  period?: 'day' | 'week' | 'month' | 'quarter';
}

// ============================================================================
// Transform API Response to Chart Data
// ============================================================================
function transformApiDataToChartData(apiData: DashboardApiResponse): AnalyticsData {
  // Transform timeline data to production metrics
  const production: ProductionMetric[] = apiData.timelineData.map(item => ({
    date: item.date,
    videos: item.events,
    duration: Math.round(item.events * 3), // Estimated duration
    completed: item.events - item.errors,
  }));

  // Calculate performance metrics from API data
  const successRate = apiData.overview.errorRate ? 100 - apiData.overview.errorRate : 100;
  const performance: PerformanceMetric[] = [
    { 
      metric: 'Taxa de Sucesso', 
      value: Math.round(successRate * 10) / 10, 
      target: 95, 
      trend: successRate >= 95 ? 'up' : 'stable' 
    },
    { 
      metric: 'Tempo Médio Render', 
      value: Math.round(apiData.performanceMetrics.avgRenderTime / 1000), 
      target: 60, 
      trend: apiData.performanceMetrics.avgRenderTime < 60000 ? 'down' : 'up'
    },
    { 
      metric: 'Eventos Totais', 
      value: apiData.overview.totalEvents, 
      target: apiData.overview.eventsLast7Days * 4, 
      trend: 'up' 
    },
    { 
      metric: 'Usuários Ativos', 
      value: apiData.overview.activeUsers, 
      target: Math.max(10, apiData.overview.activeUsers), 
      trend: 'up' 
    },
  ];

  // Transform categories from API
  const categoryColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#6b7280'];
  const categories: CategoryMetric[] = apiData.eventsByCategory.slice(0, 5).map((cat, i) => ({
    name: cat.category || 'Outros',
    value: cat.count,
    color: categoryColors[i % categoryColors.length],
  }));

  // Generate trends from timeline data
  const trends: TrendMetric[] = apiData.timelineData.slice(-6).map(item => ({
    period: item.date,
    views: item.events * 10,
    downloads: Math.round(item.events * 1.5),
    engagement: item.users > 0 ? Math.round((item.events / item.users) * 20) : 50,
  }));

  return { production, performance, categories, trends };
}

// ============================================================================
// Fallback empty data
// ============================================================================
function getEmptyData(): AnalyticsData {
  return {
    production: [],
    performance: [
      { metric: 'Taxa de Sucesso', value: 0, target: 95, trend: 'stable' },
      { metric: 'Tempo Médio Render', value: 0, target: 60, trend: 'stable' },
      { metric: 'Eventos Totais', value: 0, target: 100, trend: 'stable' },
      { metric: 'Usuários Ativos', value: 0, target: 10, trend: 'stable' },
    ],
    categories: [],
    trends: [],
  };
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
  const [apiData, setApiData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data from API
  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const periodMap = {
        day: '7d',
        week: '7d', 
        month: '30d',
        quarter: '90d'
      };
      const apiPeriod = periodMap[period] || '7d';
      
      const response = await fetch(`/api/analytics/dashboard?period=${apiPeriod}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const responseData: DashboardApiResponse = await response.json();
      const transformedData = transformApiDataToChartData(responseData);
      setApiData(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      logger.error('Analytics charts fetch error', err instanceof Error ? err : new Error(String(err)));
      setApiData(getEmptyData());
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // Only fetch if no data prop provided
    if (!data?.production || !data?.performance || !data?.categories || !data?.trends) {
      fetchAnalyticsData();
    }
  }, [data, fetchAnalyticsData]);

  const chartData = useMemo(() => {
    if (data?.production && data?.performance && data?.categories && data?.trends) {
      return data as AnalyticsData;
    }
    return apiData || getEmptyData();
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
