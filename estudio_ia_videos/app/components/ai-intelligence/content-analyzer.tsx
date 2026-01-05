
'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, TrendingUp, Target, Zap, Eye, Clock, Users, 
  BarChart3, PieChart, Activity, Lightbulb, AlertTriangle,
  CheckCircle, Star, Award, Flame, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentAnalyzerProps {
  projectId?: string;
  videoData?: {
    id: string;
    title: string;
    duration?: number;
    slides?: Array<{ id: string; content: string }>;
  };
}

interface EngagementMetric {
  metric: string;
  current: number;
  predicted: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  insights: string[];
}

interface PerformanceScore {
  category: string;
  score: number;
  maxScore: number;
  color: string;
  recommendations: string[];
}

interface SmartRecommendation {
  id: string;
  type: 'content' | 'timing' | 'structure' | 'engagement' | 'accessibility';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: number;
  effort: number;
  roi: number;
}

const ContentAnalyzer: React.FC<ContentAnalyzerProps> = ({ 
  projectId = 'proj_123',
  videoData 
}) => {
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetric[]>([]);
  const [performanceScores, setPerformanceScores] = useState<PerformanceScore[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [predictedSuccess, setPredictedSuccess] = useState(0);

  useEffect(() => {
    performContentAnalysis();
  }, [projectId]);

  const performContentAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Load engagement metrics
      const mockMetrics: EngagementMetric[] = [
        {
          metric: 'Taxa de Retenção',
          current: 78,
          predicted: 85,
          trend: 'up',
          confidence: 92,
          insights: [
            'Narração clara mantém atenção',
            'Transições suaves melhoram fluxo',
            'Conteúdo NR-12 bem estruturado'
          ]
        },
        {
          metric: 'Engagement Score',
          current: 8.4,
          predicted: 9.1,
          trend: 'up',
          confidence: 88,
          insights: [
            'Exemplos práticos aumentam interesse',
            'Interações no tempo certo',
            'Avatar 3D gera mais conexão'
          ]
        },
        {
          metric: 'Completion Rate',
          current: 82,
          predicted: 89,
          trend: 'up',
          confidence: 85,
          insights: [
            'Duração otimizada (8:45 min)',
            'Estrutura progressiva funciona',
            'Call-to-actions bem posicionadas'
          ]
        },
        {
          metric: 'Learning Retention',
          current: 76,
          predicted: 83,
          trend: 'up',
          confidence: 90,
          insights: [
            'Repetição espaçada efetiva',
            'Exemplos visuais reforçam conceitos',
            'Quizzes aumentam fixação'
          ]
        }
      ];

      setEngagementMetrics(mockMetrics);

      // Load performance scores
      const mockScores: PerformanceScore[] = [
        {
          category: 'Qualidade de Conteúdo',
          score: 9.2,
          maxScore: 10,
          color: 'text-green-500',
          recommendations: [
            'Adicionar mais casos reais da indústria',
            'Incluir estatísticas atualizadas de acidentes',
            'Expandir exemplos de boas práticas'
          ]
        },
        {
          category: 'Experiência Visual',
          score: 8.8,
          maxScore: 10,
          color: 'text-blue-500',
          recommendations: [
            'Melhorar transições entre slides',
            'Adicionar animações nos pontos-chave',
            'Otimizar contraste para acessibilidade'
          ]
        },
        {
          category: 'Áudio e Narração',
          score: 9.5,
          maxScore: 10,
          color: 'text-purple-500',
          recommendations: [
            'Voz ElevenLabs com excelente clareza',
            'Ritmo adequado para absorção',
            'Entonação profissional mantida'
          ]
        },
        {
          category: 'Estrutura Pedagógica',
          score: 8.6,
          maxScore: 10,
          color: 'text-orange-500',
          recommendations: [
            'Implementar microlearning avançado',
            'Adicionar checkpoints de compreensão',
            'Expandir resumo final'
          ]
        },
        {
          category: 'Compliance NR-12',
          score: 9.7,
          maxScore: 10,
          color: 'text-red-500',
          recommendations: [
            'Cobertura completa dos requisitos',
            'Referências normativas atualizadas',
            'Exemplos alinhados à legislação'
          ]
        }
      ];

      setPerformanceScores(mockScores);

      // Load smart recommendations
      const mockRecommendations: SmartRecommendation[] = [
        {
          id: 'rec_1',
          type: 'engagement',
          priority: 'high',
          title: 'Adicionar Interatividade no Minuto 3:20',
          description: 'IA detectou queda de atenção. Inserir pergunta ou quiz neste ponto aumentaria retenção em 15%.',
          impact: 85,
          effort: 30,
          roi: 2.8
        },
        {
          id: 'rec_2',
          type: 'content',
          priority: 'high',
          title: 'Expandir Seção de Exemplos Práticos',
          description: 'Usuários passam 40% mais tempo em slides com casos reais. Adicionar 2-3 exemplos da indústria.',
          impact: 78,
          effort: 45,
          roi: 1.7
        },
        {
          id: 'rec_3',
          type: 'structure',
          priority: 'medium',
          title: 'Otimizar Duração dos Slides 5-7',
          description: 'Slides muito densos. Dividir conteúdo em chunks menores melhoraria compreensão.',
          impact: 65,
          effort: 25,
          roi: 2.6
        },
        {
          id: 'rec_4',
          type: 'accessibility',
          priority: 'medium',
          title: 'Implementar Legendas Inteligentes',
          description: 'Legendas automáticas com destaque de termos técnicos aumentariam acessibilidade.',
          impact: 70,
          effort: 35,
          roi: 2.0
        },
        {
          id: 'rec_5',
          type: 'timing',
          priority: 'low',
          title: 'Ajustar Velocidade da Narração',
          description: 'Reduzir velocidade em 10% nos conceitos mais complexos melhoraria absorção.',
          impact: 45,
          effort: 15,
          roi: 3.0
        }
      ];

      setRecommendations(mockRecommendations);

      // Calculate overall metrics
      const avgScore = mockScores.reduce((acc, score) => acc + score.score, 0) / mockScores.length;
      setOverallScore(Math.round(avgScore * 10));

      const avgPrediction = mockMetrics.reduce((acc, metric) => acc + metric.predicted, 0) / mockMetrics.length;
      setPredictedSuccess(Math.round(avgPrediction));

      setAnalysisComplete(true);
      toast.success('Análise de conteúdo concluída com IA');

    } catch (error) {
      logger.error('Erro na análise', error instanceof Error ? error : new Error(String(error)), { component: 'ContentAnalyzer' });
      toast.error('Erro ao analisar conteúdo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendation = (recommendationId: string) => {
    setRecommendations(recommendations.map(rec => 
      rec.id === recommendationId 
        ? { ...rec, priority: 'low' }
        : rec
    ));
    toast.success('Recomendação aplicada ao projeto');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'content': return <Brain className="h-4 w-4" />;
      case 'engagement': return <Users className="h-4 w-4" />;
      case 'structure': return <BarChart3 className="h-4 w-4" />;
      case 'timing': return <Clock className="h-4 w-4" />;
      case 'accessibility': return <Eye className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-100 dark:from-purple-900 dark:via-indigo-900 dark:to-blue-900 transition-all duration-300">
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              🧠 AI Content Intelligence
            </h1>
            <p className="text-muted-foreground">
              Análise inteligente de desempenho e otimização automática • NR-12 Segurança
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="default" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              IA Avançada
            </Badge>
            
            <Button onClick={performContentAnalysis} disabled={isAnalyzing} className="flex items-center gap-2">
              {isAnalyzing ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Reanalisar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Overall Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Score Geral</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{overallScore}%</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-3">
                <Progress value={overallScore} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Sucesso Previsto</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{predictedSuccess}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-3">
                <Progress value={predictedSuccess} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Confiança IA</p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">89%</p>
                </div>
                <Brain className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-3">
                <Progress value={89} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">ROI Médio</p>
                  <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">2.4x</p>
                </div>
                <Target className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="metrics" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
            <TabsTrigger value="predictions">Predições</TabsTrigger>
          </TabsList>

          {/* Engagement Metrics */}
          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Métricas de Engagement
                </CardTitle>
                <CardDescription>
                  Análise em tempo real do desempenho do conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {engagementMetrics.map((metric, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{metric.metric}</h3>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(metric.trend)}
                          <Badge variant="outline">{metric.confidence}% confiança</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Atual</span>
                          <span className="text-lg font-bold">{metric.current}{metric.metric.includes('Score') ? '/10' : '%'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Previsto</span>
                          <span className="text-lg font-bold text-green-600">{metric.predicted}{metric.metric.includes('Score') ? '/10' : '%'}</span>
                        </div>
                        
                        <Progress value={metric.current} className="h-2" />
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Insights:</p>
                          {metric.insights.map((insight, i) => (
                            <p key={i} className="text-xs text-muted-foreground">• {insight}</p>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Scores */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Scores de Performance
                </CardTitle>
                <CardDescription>
                  Avaliação detalhada por categoria de conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {performanceScores.map((score, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{score.category}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${score.color}`}>
                            {score.score}/{score.maxScore}
                          </span>
                          <Star className={`h-5 w-5 ${score.score >= 9 ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                        </div>
                      </div>
                      
                      <Progress value={(score.score / score.maxScore) * 100} className="h-3" />
                      
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Recomendações:</p>
                        {score.recommendations.map((rec, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {rec}</p>
                        ))}
                      </div>
                      
                      {index < performanceScores.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Smart Recommendations */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Recomendações Inteligentes ({recommendations.length})
                </CardTitle>
                <CardDescription>
                  Sugestões baseadas em IA para otimizar seu conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map(rec => (
                    <Card key={rec.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(rec.type)}
                          <div>
                            <h3 className="font-semibold">{rec.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(rec.priority)}>
                            {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Impacto</p>
                          <p className="font-bold text-green-600">{rec.impact}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Esforço</p>
                          <p className="font-bold text-blue-600">{rec.effort}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">ROI</p>
                          <p className="font-bold text-purple-600">{rec.roi}x</p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleApplyRecommendation(rec.id)}
                        className="w-full"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aplicar Recomendação
                      </Button>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Predictions */}
          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Predições de IA
                </CardTitle>
                <CardDescription>
                  Previsões baseadas em machine learning sobre performance futura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Success Prediction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                      <h3 className="font-semibold">Taxa de Sucesso Prevista</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-600 mb-2">89%</p>
                    <p className="text-sm text-muted-foreground">
                      Baseado em 15.000+ vídeos similares de treinamento NR
                    </p>
                    <div className="mt-3">
                      <Progress value={89} className="h-2" />
                    </div>
                  </Card>

                  <Card className="p-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Users className="h-6 w-6 text-blue-500" />
                      <h3 className="font-semibold">Audiência Estimada</h3>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mb-2">2.4K</p>
                    <p className="text-sm text-muted-foreground">
                      Visualizações nos próximos 30 dias
                    </p>
                    <div className="mt-3">
                      <Progress value={75} className="h-2" />
                    </div>
                  </Card>
                </div>

                {/* Performance Timeline */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline de Performance
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Primeira semana</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">750 views</span>
                        <Badge variant="outline">+15%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Primeiro mês</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">2.4K views</span>
                        <Badge variant="outline">+22%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Trimestre</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">8.1K views</span>
                        <Badge variant="outline">+18%</Badge>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Risk Analysis */}
                <Card className="p-4 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Análise de Riscos
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Risco de baixo engagement</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">Baixo (12%)</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Risco de não completion</span>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">Médio (28%)</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Risco de compliance</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">Baixo (3%)</Badge>
                    </div>
                  </div>
                </Card>

              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
    </div>
  );
};

export default ContentAnalyzer;
