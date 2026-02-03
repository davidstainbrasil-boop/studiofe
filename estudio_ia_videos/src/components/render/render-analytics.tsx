

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Video,
  Zap,
  Users,
  Calendar,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { logger } from '@lib/logger'

interface AnalyticsData {
  performance: {
    daily_renders: Array<{ date: string, count: number, success_rate: number }>
    cost_analysis: Array<{ date: string, cost: number, renders: number }>
    quality_metrics: Array<{ date: string, avg_quality: number, satisfaction: number }>
  }
  usage: {
    by_user: Array<{ user: string, renders: number, cost: number }>
    by_project_type: Array<{ type: string, count: number, percentage: number }>
    by_resolution: Array<{ resolution: string, count: number, cost: number }>
  }
  system: {
    resource_usage: Array<{ time: string, cpu: number, gpu: number, memory: number }>
    queue_performance: Array<{ hour: number, avg_wait: number, throughput: number }>
    error_analysis: Array<{ type: string, count: number, impact: string }>
  }
}

export default function RenderAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('7d')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real analytics data from API
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/render/analytics?period=${selectedPeriod}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required')
        }
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }
      
      const data: AnalyticsData = await response.json()
      setAnalyticsData(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(errorMessage)
      logger.error('Render analytics fetch error', err instanceof Error ? err : new Error(String(err)))
      toast.error('Falha ao carregar analytics de renderização')
      
      // Set empty data on error instead of mock
      setAnalyticsData({
        performance: {
          daily_renders: [],
          cost_analysis: [],
          quality_metrics: []
        },
        usage: {
          by_user: [],
          by_project_type: [],
          by_resolution: []
        },
        system: {
          resource_usage: [],
          queue_performance: [],
          error_analysis: []
        }
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="w-8 h-8 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Dados não disponíveis</h3>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Analytics de Renderização
          </h2>
          <p className="text-muted-foreground">
            Análise detalhada de performance e custos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={selectedPeriod === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('24h')}
          >
            24h
          </Button>
          <Button
            variant={selectedPeriod === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('7d')}
          >
            7 dias
          </Button>
          <Button
            variant={selectedPeriod === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('30d')}
          >
            30 dias
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Renders</p>
                <p className="text-2xl font-bold text-blue-600">244</p>
                <p className="text-xs text-green-600">+23% vs semana anterior</p>
              </div>
              <Video className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-green-600">97.3%</p>
                <p className="text-xs text-green-600">+1.2% vs semana anterior</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-2xl font-bold text-purple-600">$58.47</p>
                <p className="text-xs text-red-600">+12% vs semana anterior</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold text-orange-600">42s</p>
                <p className="text-xs text-green-600">-8s vs semana anterior</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Uso</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Renders Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Renders Diários</CardTitle>
                <CardDescription>Volume de renderizações por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analyticsData.performance.daily_renders}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Success Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Taxa de Sucesso</CardTitle>
                <CardDescription>Tendência de qualidade ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analyticsData.performance.daily_renders}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0.9, 1.0]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="success_rate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Usage by Project Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uso por Tipo de Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analyticsData.usage.by_project_type}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="type"
                    >
                      {analyticsData.usage.by_project_type.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="mt-4 space-y-2">
                  {analyticsData.usage.by_project_type.map((item, index) => (
                    <div key={item.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span>{item.type}</span>
                      </div>
                      <span className="font-medium">{item.count} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usuários Mais Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.usage.by_user.map((user, index) => (
                    <div key={user.user} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium text-sm">{user.user}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.renders} renders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${user.cost.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">custo total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs">
          <div className="space-y-6">
            
            {/* Cost Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendência de Custos</CardTitle>
                <CardDescription>Evolução dos custos de renderização</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.performance.cost_analysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Por Resolução</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.usage.by_resolution.map((item) => (
                      <div key={item.resolution} className="flex items-center justify-between">
                        <span className="text-sm">{item.resolution}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">${item.cost.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{item.count} videos</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">$0.24</div>
                  <div className="text-sm text-muted-foreground">Custo médio/render</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">91%</div>
                  <div className="text-sm text-muted-foreground">Eficiência de custo</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <div className="space-y-6">
            
            {/* Resource Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uso de Recursos (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.system.resource_usage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU" />
                    <Line type="monotone" dataKey="gpu" stroke="#8b5cf6" name="GPU" />
                    <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memória" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análise de Erros</CardTitle>
                <CardDescription>Tipos de erro mais frequentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.system.error_analysis.map((error, index) => (
                    <div key={error.type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          error.impact === 'high' ? 'bg-red-500' :
                          error.impact === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{error.type}</p>
                          <p className="text-xs text-muted-foreground">
                            Impacto: {error.impact}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {error.count} ocorrências
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

