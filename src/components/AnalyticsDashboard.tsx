'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AnalyticsData {
  overview: {
    totalProjects: number;
    totalVideos: number;
    completedVideos: number;
    totalDuration: number;
    totalStorage: number;
    avgProcessingTime: number;
    successRate: number;
  };
  usage: {
    dailyData: Array<{
      date: string;
      projects: number;
      videos: number;
      completed: number;
    }>;
    weeklyData: any[];
    monthlyData: any[];
  };
  projects: {
    top: Array<{
      id: string;
      title: string;
      videoCount: number;
      createdAt: string;
    }>;
    total: number;
  };
  templates: Array<{
    category: string;
    count: number;
    templates: Array<{
      id: string;
      name: string;
    }>;
  }>;
  quality: Array<{
    quality: string;
    count: number;
    percentage: number;
  }>;
  storage: {
    used: number;
    available: number;
    percentage: number;
  };
  performance: {
    avgProcessingTime: number;
    successRate: number;
    totalProcessed: number;
    errors: number;
  };
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }>;
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [chartData, setChartData] = useState<ChartData | null>(null);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, period]);

  useEffect(() => {
    if (analytics) {
      processChartData();
    }
  }, [analytics]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/analytics?period=${period}`);

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        console.error('Erro ao buscar analytics');
      }
    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = () => {
    if (!analytics) return;

    const labels = analytics.usage.dailyData.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

    const chartData: ChartData = {
      labels,
      datasets: [
        {
          label: 'Projetos',
          data: analytics.usage.dailyData.map((item) => item.projects),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
        },
        {
          label: 'Vídeos Criados',
          data: analytics.usage.dailyData.map((item) => item.videos),
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
        },
        {
          label: 'Vídeos Concluídos',
          data: analytics.usage.dailyData.map((item) => item.completed),
          backgroundColor: 'rgba(251, 146, 60, 0.2)',
          borderColor: 'rgba(251, 146, 60, 1)',
        },
      ],
    };

    setChartData(chartData);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getQualityColor = (quality: string) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-purple-100 text-purple-800',
      ULTRA: 'bg-yellow-100 text-yellow-800',
    };
    return colors[quality as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <button
            onClick={() => (window.location.href = '/auth/signin')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="1y">Último ano</option>
              </select>
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Carregando analytics...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    📁
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Total de Projetos</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {analytics.overview.totalProjects}
                </p>
                <p className="text-sm text-gray-600 mt-1">No período selecionado</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    🎬
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Vídeos Criados</h3>
                <p className="text-3xl font-bold text-green-600">
                  {analytics.overview.totalVideos}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {analytics.overview.completedVideos} concluídos
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    ⏱️
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Tempo Total</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {formatDuration(analytics.overview.totalDuration)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Duração de conteúdo</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    📊
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Taxa de Sucesso</h3>
                <p className="text-3xl font-bold">
                  <span className={getPerformanceColor(analytics.overview.successRate)}>
                    {analytics.overview.successRate}%
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-1">Concluídos com sucesso</p>
              </div>
            </div>

            {/* Usage Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Uso Diário</h2>
              {chartData && (
                <div className="h-64">
                  {/* Simple bar chart visualization */}
                  <div className="space-y-2">
                    {chartData.labels.map((label, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-20 text-sm text-gray-600">{label}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{
                              width: `${Math.max(2, (chartData.datasets[1].data[index] / Math.max(...chartData.datasets[1].data)) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="w-12 text-sm text-right text-gray-900">
                          {chartData.datasets[1].data[index]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Storage Usage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Armazenamento</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Usado</span>
                      <span className="text-sm font-medium">
                        {formatBytes(analytics.storage.used)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${analytics.storage.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Disponível</span>
                    <span className="text-sm font-medium">
                      {formatBytes(analytics.storage.available)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Video Quality Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Distribuição de Qualidade
                </h2>
                <div className="space-y-3">
                  {analytics.quality.map((quality) => (
                    <div key={quality.quality} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getQualityColor(quality.quality)}`}
                        >
                          {quality.quality}
                        </span>
                        <span className="text-sm text-gray-600">{quality.count} vídeos</span>
                      </div>
                      <span className="text-sm font-medium">{quality.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Métricas de Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.performance.avgProcessingTime}m
                  </p>
                  <p className="text-sm text-gray-600">Tempo Médio</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.performance.successRate}%
                  </p>
                  <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics.performance.totalProcessed}
                  </p>
                  <p className="text-sm text-gray-600">Processados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{analytics.performance.errors}</p>
                  <p className="text-sm text-gray-600">Falhas</p>
                </div>
              </div>
            </div>

            {/* Top Projects */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Projetos Mais Ativos</h2>
              <div className="space-y-3">
                {analytics.projects.top.map((project, index) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{project.title}</p>
                      <p className="text-sm text-gray-600">{project.videoCount} vídeos</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">Nenhum dado disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}
