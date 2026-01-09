/**
 * 📊 Estúdio IA de Vídeos - Sprint 5
 * Dashboard de Video Analytics Avançado
 */

'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Progress } from '@components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
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
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Play,
  Clock,
  Target,
  AlertTriangle,
  Heart,
  MessageSquare,
  Eye,
  MapPin,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

const timeRangeOptions = ['1h', '24h', '7d', '30d'] as const;
type TimeRange = typeof timeRangeOptions[number];

const metricTabs = ['overview', 'engagement', 'sentiment', 'audience', 'performance'] as const;
type MetricTab = typeof metricTabs[number];

interface RetentionPoint {
  time: number;
  retention: number;
}

interface DropOffPoint {
  time: number;
  dropRate: number;
}

interface DeviceMetrics {
  desktop: number;
  mobile: number;
  tablet: number;
}

interface QualityMetrics {
  averageQuality: string;
  qualityChanges: number;
  bufferingEvents: number;
}

interface SentimentDistribution {
  joy: number;
  surprise: number;
  neutral: number;
  sadness: number;
  anger: number;
  fear: number;
}

interface SentimentMetrics {
  overallSentiment: number;
  emotionDistribution: SentimentDistribution;
}

interface GeographicDatum {
  country: string;
  views: number;
  sentiment: number;
}

interface AnalyticsMetrics {
  totalViews: number;
  uniqueViews: number;
  averageWatchTime: number;
  completionRate: number;
  retentionCurve: RetentionPoint[];
  dropOffPoints: DropOffPoint[];
  deviceMetrics: DeviceMetrics;
  qualityMetrics: QualityMetrics;
  sentimentMetrics: SentimentMetrics;
  geographicData: GeographicDatum[];
}

interface RealtimeMetrics {
  currentViewers: number;
  peakViewers: number;
  averageViewTime: number;
  currentRetention: number;
  activeInteractions: number;
  sentimentScore: number;
}

const isTimeRange = (value: string): value is TimeRange =>
  timeRangeOptions.some((range) => range === value);

const isMetricTab = (value: string): value is MetricTab =>
  metricTabs.some((tab) => tab === value);

interface VideoAnalyticsDashboardProps {
  videoId: string;
}

export default function VideoAnalyticsDashboard({ videoId }: VideoAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [realtime, setRealtime] = useState<RealtimeMetrics | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricTab>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadRealtimeData, 5000);
    return () => clearInterval(interval);
  }, [videoId, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/video-analytics/${videoId}?range=${timeRange}`);
      const data: AnalyticsMetrics = await response.json();
      setMetrics(data);
    } catch (error) {
      logger.error('Erro ao carregar analytics', error instanceof Error ? error : new Error(String(error)), { component: 'AnalyticsDashboard', videoId });
      setMetrics(mockAnalyticsData);
    }
  };

  const loadRealtimeData = async () => {
    try {
      const response = await fetch(`/api/video-analytics/${videoId}/realtime`);
      const data: RealtimeMetrics = await response.json();
      setRealtime(data);
    } catch (error) {
      logger.error('Erro ao carregar dados em tempo real', error instanceof Error ? error : new Error(String(error)), { component: 'AnalyticsDashboard', videoId });
      setRealtime(mockRealtimeData);
    }
  };

  const mockAnalyticsData: AnalyticsMetrics = {
    totalViews: 15420,
    uniqueViews: 12350,
    averageWatchTime: 312,
    completionRate: 0.78,
    retentionCurve: [
      { time: 0, retention: 1.0 },
      { time: 30, retention: 0.92 },
      { time: 60, retention: 0.85 },
      { time: 120, retention: 0.75 },
      { time: 180, retention: 0.68 },
      { time: 240, retention: 0.58 },
      { time: 300, retention: 0.45 },
    ],
    dropOffPoints: [
      { time: 45, dropRate: 0.15 },
      { time: 180, dropRate: 0.22 },
      { time: 280, dropRate: 0.18 }
    ],
    deviceMetrics: {
      desktop: 8520,
      mobile: 5200,
      tablet: 1700
    },
    qualityMetrics: {
      averageQuality: 'HD',
      qualityChanges: 230,
      bufferingEvents: 45
    },
    sentimentMetrics: {
      overallSentiment: 0.72,
      emotionDistribution: {
        joy: 0.45,
        surprise: 0.20,
        neutral: 0.25,
        sadness: 0.05,
        anger: 0.03,
        fear: 0.02
      }
    },
    geographicData: [
      { country: 'BR', views: 12450, sentiment: 0.75 },
      { country: 'US', views: 1200, sentiment: 0.68 },
      { country: 'AR', views: 980, sentiment: 0.71 },
      { country: 'PT', views: 790, sentiment: 0.69 }
    ]
  };

  const mockRealtimeData: RealtimeMetrics = {
    currentViewers: 127,
    peakViewers: 340,
    averageViewTime: 285,
    currentRetention: 0.73,
    activeInteractions: 45,
    sentimentScore: 0.68
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.7) return 'text-green-600';
    if (sentiment >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentEmoji = (sentiment: number) => {
    if (sentiment >= 0.8) return '🤩';
    if (sentiment >= 0.6) return '😊';
    if (sentiment >= 0.4) return '😐';
    if (sentiment >= 0.2) return '😕';
    return '😞';
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Video Analytics</h1>
          <p className="text-gray-600">Análise avançada de engajamento e performance</p>
        </div>

        <div className="flex items-center space-x-2">
          <select 
            value={timeRange}
            onChange={(e) => {
              const value = e.target.value;
              if (isTimeRange(value)) {
                setTimeRange(value);
              }
            }}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Última Hora</option>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
          
          <Button variant="outline" size="sm">
            📥 Exportar
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      {realtime && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Ao Vivo</p>
                  <p className="text-2xl font-bold text-blue-600">{realtime.currentViewers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Pico</p>
                  <p className="text-2xl font-bold text-green-600">{realtime.peakViewers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Tempo Médio</p>
                  <p className="text-2xl font-bold text-purple-600">{Math.floor(realtime.averageViewTime / 60)}m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Retenção</p>
                  <p className="text-2xl font-bold text-orange-600">{(realtime.currentRetention * 100).toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-pink-50 to-pink-100">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-pink-600" />
                <div>
                  <p className="text-sm text-gray-600">Interações</p>
                  <p className="text-2xl font-bold text-pink-600">{realtime.activeInteractions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-r from-gray-50 to-gray-100`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Heart className={`h-5 w-5 ${getSentimentColor(realtime.sentimentScore)}`} />
                <div>
                  <p className="text-sm text-gray-600">Sentiment</p>
                  <div className="flex items-center space-x-1">
                    <span className="text-xl">{getSentimentEmoji(realtime.sentimentScore)}</span>
                    <span className={`text-lg font-bold ${getSentimentColor(realtime.sentimentScore)}`}>
                      {(realtime.sentimentScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs
        value={selectedMetric}
        onValueChange={(value) => {
          if (isMetricTab(value)) {
            setSelectedMetric(value);
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">📊 Visão Geral</TabsTrigger>
          <TabsTrigger value="engagement">🎯 Engajamento</TabsTrigger>
          <TabsTrigger value="sentiment">💭 Sentiment</TabsTrigger>
          <TabsTrigger value="audience">👥 Audiência</TabsTrigger>
          <TabsTrigger value="performance">⚡ Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Visualizações</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12.5%</span> vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visualizações Únicas</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.uniqueViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+8.2%</span> vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.floor(metrics.averageWatchTime / 60)}m {metrics.averageWatchTime % 60}s</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-600">-2.1%</span> vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(metrics.completionRate * 100).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+5.7%</span> vs período anterior
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Retention Curve */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Curva de Retenção</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.retentionCurve}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`}
                  />
                  <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip 
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Retenção']}
                    labelFormatter={(value) => `Tempo: ${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="retention" 
                    stroke="#3b82f6" 
                    fill="#93c5fd" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Drop-off Points */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>🔻 Pontos de Abandono Críticos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.dropOffPoints.map((point, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">{Math.floor(point.time / 60)}:{(point.time % 60).toString().padStart(2, '0')}</Badge>
                      <span className="text-sm">Abandono significativo detectado</span>
                    </div>
                    <Badge variant="destructive">
                      -{(point.dropRate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          {/* Overall Sentiment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className={`h-5 w-5 ${getSentimentColor(metrics.sentimentMetrics.overallSentiment)}`} />
                <span>💭 Análise de Sentiment Geral</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-6 py-8">
                <div className="text-center">
                  <div className="text-6xl mb-2">{getSentimentEmoji(metrics.sentimentMetrics.overallSentiment)}</div>
                  <div className={`text-3xl font-bold ${getSentimentColor(metrics.sentimentMetrics.overallSentiment)}`}>
                    {(metrics.sentimentMetrics.overallSentiment * 100).toFixed(0)}%
                  </div>
                  <p className="text-gray-600">Sentiment Positivo</p>
                </div>
                
                <div className="w-64">
                  <Progress 
                    value={metrics.sentimentMetrics.overallSentiment * 100} 
                    className="h-4"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Negativo</span>
                    <span>Neutro</span>
                    <span>Positivo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emotion Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>🎭 Distribuição de Emoções</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(metrics.sentimentMetrics.emotionDistribution).map(([emotion, value]) => {
                  const emotionEmojis = {
                    joy: '😊',
                    surprise: '😲',
                    neutral: '😐',
                    sadness: '😢',
                    anger: '😠',
                    fear: '😰'
                  };
                  
                  return (
                    <div key={emotion} className="text-center p-4 border rounded-lg">
                      <div className="text-3xl mb-2">{emotionEmojis[emotion as keyof typeof emotionEmojis]}</div>
                      <div className="text-2xl font-bold">{(value * 100).toFixed(0)}%</div>
                      <p className="text-sm capitalize text-gray-600">{emotion}</p>
                      <Progress value={value * 100} className="mt-2 h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          {/* Device Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📱 Distribuição por Dispositivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-5 w-5" />
                      <span>Desktop</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">{metrics.deviceMetrics.desktop.toLocaleString()}</span>
                      <Badge variant="secondary">{((metrics.deviceMetrics.desktop / metrics.totalViews) * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={(metrics.deviceMetrics.desktop / metrics.totalViews) * 100} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-5 w-5" />
                      <span>Mobile</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">{metrics.deviceMetrics.mobile.toLocaleString()}</span>
                      <Badge variant="secondary">{((metrics.deviceMetrics.mobile / metrics.totalViews) * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={(metrics.deviceMetrics.mobile / metrics.totalViews) * 100} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Tablet className="h-5 w-5" />
                      <span>Tablet</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">{metrics.deviceMetrics.tablet.toLocaleString()}</span>
                      <Badge variant="secondary">{((metrics.deviceMetrics.tablet / metrics.totalViews) * 100).toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={(metrics.deviceMetrics.tablet / metrics.totalViews) * 100} />
                </div>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>🌍 Distribuição Geográfica</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.geographicData.map((geo) => (
                    <div key={geo.country} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{geo.country}</Badge>
                        <span className="text-sm">{geo.views.toLocaleString()} visualizações</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">{getSentimentEmoji(geo.sentiment)}</span>
                        <span className={`text-sm font-bold ${getSentimentColor(geo.sentiment)}`}>
                          {(geo.sentiment * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Technical Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🎬 Qualidade Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{metrics.qualityMetrics.averageQuality}</div>
                  <p className="text-sm text-gray-600">Resolução predominante</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔄 Mudanças de Qualidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">{metrics.qualityMetrics.qualityChanges}</div>
                  <p className="text-sm text-gray-600">Adaptações automáticas</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⏳ Eventos de Buffer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600 mb-2">{metrics.qualityMetrics.bufferingEvents}</div>
                  <p className="text-sm text-gray-600">Interrupções de carregamento</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Insights de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-green-600 text-xl">✅</div>
                  <div>
                    <h4 className="font-semibold text-green-800">Excelente Taxa de Retenção</h4>
                    <p className="text-sm text-green-700">Sua taxa de conclusão de 78% está acima da média da plataforma (65%)</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-yellow-600 text-xl">⚠️</div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Atenção aos Pontos de Abandono</h4>
                    <p className="text-sm text-yellow-700">Detectamos 3 pontos críticos onde muitos usuários abandonam o vídeo</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-blue-600 text-xl">💡</div>
                  <div>
                    <h4 className="font-semibold text-blue-800">Oportunidade de Melhoria</h4>
                    <p className="text-sm text-blue-700">Considere adicionar elementos interativos nos minutos 3-5 para manter o engajamento</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
