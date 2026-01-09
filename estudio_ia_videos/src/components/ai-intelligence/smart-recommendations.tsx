
'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Progress } from '@components/ui/progress';
import { Separator } from '@components/ui/separator';
import { ScrollArea } from '@components/ui/scroll-area';
import { 
  Lightbulb, Zap, TrendingUp, Target, Brain, Star,
  CheckCircle, Clock, Users, BarChart3, Flame,
  ArrowRight, Eye, Settings, Wand2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface SmartRecommendationsProps {
  projectId?: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'content' | 'engagement' | 'performance' | 'accessibility' | 'structure' | 'compliance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: number;
  effort: number;
  roi: number;
  confidence: number;
  aiReasoning: string[];
  expectedResults: {
    metric: string;
    improvement: string;
  }[];
  implementation: {
    steps: string[];
    timeEstimate: string;
    resources: string[];
  };
  appliedCount: number;
  successRate: number;
}

interface AutoOptimization {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedTime: string;
  impact: string;
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ 
  projectId = 'proj_123' 
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [autoOptimizations, setAutoOptimizations] = useState<AutoOptimization[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSmartRecommendations();
    loadAutoOptimizations();
  }, [projectId]);

  const loadSmartRecommendations = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockRecommendations: Recommendation[] = [
        {
          id: 'rec_1',
          title: 'Adicionar Quiz Interativo no Minuto 4:20',
          description: 'IA detectou 23% de queda na atenção neste ponto. Inserir quiz sobre EPIs aumentaria retenção significativamente.',
          category: 'engagement',
          priority: 'critical',
          impact: 92,
          effort: 35,
          roi: 2.6,
          confidence: 94,
          aiReasoning: [
            'Análise de eye-tracking mostra dispersão visual',
            'Pattern matching com 15.000+ vídeos similares',
            'Quizzes em pontos críticos aumentam retenção em 28%'
          ],
          expectedResults: [
            { metric: 'Taxa de Retenção', improvement: '+28%' },
            { metric: 'Completion Rate', improvement: '+15%' },
            { metric: 'Learning Score', improvement: '+22%' }
          ],
          implementation: {
            steps: [
              'Criar pergunta sobre equipamentos de proteção',
              'Inserir quiz no timeline 4:20',
              'Configurar feedback visual',
              'Testar fluxo de interação'
            ],
            timeEstimate: '25-30 minutos',
            resources: ['Editor de Quiz', 'Biblioteca de Perguntas NR-12']
          },
          appliedCount: 847,
          successRate: 89
        },
        {
          id: 'rec_2',
          title: 'Otimizar Velocidade da Narração em Conceitos Técnicos',
          description: 'Redução de 15% na velocidade durante explicação de procedimentos complexos melhoraria compreensão.',
          category: 'accessibility',
          priority: 'high',
          impact: 76,
          effort: 20,
          roi: 3.8,
          confidence: 87,
          aiReasoning: [
            'Análise linguística detecta alta densidade informacional',
            'Usuários pausam frequentemente nestes trechos',
            'Velocidade otimizada melhora absorção em 31%'
          ],
          expectedResults: [
            { metric: 'Compreensão', improvement: '+31%' },
            { metric: 'Satisfação', improvement: '+18%' },
            { metric: 'Pausas Desnecessárias', improvement: '-45%' }
          ],
          implementation: {
            steps: [
              'Identificar trechos com alta densidade técnica',
              'Ajustar velocidade da narração ElevenLabs',
              'Adicionar pausas estratégicas',
              'Validar com grupo de teste'
            ],
            timeEstimate: '15-20 minutos',
            resources: ['TTS Engine', 'Timeline Editor']
          },
          appliedCount: 1243,
          successRate: 92
        },
        {
          id: 'rec_3',
          title: 'Expandir Exemplos Práticos da Indústria Automobilística',
          description: 'Adicionar 2-3 casos reais específicos do setor automotivo aumentaria relevância e engajamento.',
          category: 'content',
          priority: 'high',
          impact: 85,
          effort: 55,
          roi: 1.5,
          confidence: 91,
          aiReasoning: [
            '67% dos usuários trabalham no setor automotivo',
            'Exemplos específicos do setor aumentam retenção em 34%',
            'Casos reais geram 2.3x mais interação'
          ],
          expectedResults: [
            { metric: 'Relevância Percebida', improvement: '+34%' },
            { metric: 'Engagement Score', improvement: '+25%' },
            { metric: 'Aplicação Prática', improvement: '+41%' }
          ],
          implementation: {
            steps: [
              'Pesquisar casos reais da Toyota, Volkswagen, Ford',
              'Criar slides específicos com exemplos',
              'Adaptar narração para incluir casos',
              'Validar precisão técnica com especialistas'
            ],
            timeEstimate: '45-60 minutos',
            resources: ['Banco de Casos', 'Design System', 'Validação Técnica']
          },
          appliedCount: 523,
          successRate: 83
        },
        {
          id: 'rec_4',
          title: 'Implementar Microlearning com Checkpoints',
          description: 'Dividir conteúdo em 4 módulos com checkpoints de 2 minutos cada melhoraria absorção e flexibilidade.',
          category: 'structure',
          priority: 'medium',
          impact: 68,
          effort: 45,
          roi: 1.5,
          confidence: 82,
          aiReasoning: [
            'Curva de atenção ideal: módulos de 2-3 minutos',
            'Checkpoints permitem pausas estratégicas',
            'Flexibilidade aumenta completion rate em 19%'
          ],
          expectedResults: [
            { metric: 'Completion Rate', improvement: '+19%' },
            { metric: 'Flexibilidade', improvement: '+56%' },
            { metric: 'Retenção', improvement: '+24%' }
          ],
          implementation: {
            steps: [
              'Analisar pontos naturais de divisão',
              'Criar 4 módulos temáticos',
              'Inserir checkpoints com resumos',
              'Implementar navegação modular'
            ],
            timeEstimate: '35-45 minutos',
            resources: ['Editor Modular', 'Sistema de Navegação']
          },
          appliedCount: 312,
          successRate: 78
        },
        {
          id: 'rec_5',
          title: 'Adicionar Legendas Inteligentes com Destaque de Termos',
          description: 'Legendas automáticas com highlight em termos técnicos NR-12 melhoraria acessibilidade e fixação.',
          category: 'accessibility',
          priority: 'medium',
          impact: 72,
          effort: 30,
          roi: 2.4,
          confidence: 86,
          aiReasoning: [
            '15% dos usuários assistem com áudio reduzido',
            'Destaque visual melhora memorização em 26%',
            'Acessibilidade é requisito compliance'
          ],
          expectedResults: [
            { metric: 'Acessibilidade', improvement: '+45%' },
            { metric: 'Fixação de Termos', improvement: '+26%' },
            { metric: 'Satisfação Geral', improvement: '+18%' }
          ],
          implementation: {
            steps: [
              'Gerar legendas automáticas com IA',
              'Identificar termos técnicos NR-12',
              'Aplicar estilo visual para destacar',
              'Testar legibilidade e contraste'
            ],
            timeEstimate: '25-30 minutos',
            resources: ['AI Transcription', 'Dicionário NR-12', 'CSS Styling']
          },
          appliedCount: 678,
          successRate: 85
        },
        {
          id: 'rec_6',
          title: 'Otimizar Transições com Base em Neurociência',
          description: 'Aplicar transições baseadas em princípios de neurociência para melhorar fluxo cognitivo.',
          category: 'performance',
          priority: 'low',
          impact: 54,
          effort: 25,
          roi: 2.2,
          confidence: 73,
          aiReasoning: [
            'Transições abruptas causam desconforto cognitivo',
            'Timing de 0.8s é ideal para absorção',
            'Padrões naturais reduzem fadiga mental em 22%'
          ],
          expectedResults: [
            { metric: 'Conforto Visual', improvement: '+22%' },
            { metric: 'Fadiga Mental', improvement: '-18%' },
            { metric: 'Fluxo Cognitivo', improvement: '+16%' }
          ],
          implementation: {
            steps: [
              'Analisar timing atual das transições',
              'Aplicar curvas de easing otimizadas',
              'Ajustar duração para 0.8s padrão',
              'Testar com grupo de usuários'
            ],
            timeEstimate: '20-25 minutos',
            resources: ['Animation Engine', 'Timing Library']
          },
          appliedCount: 234,
          successRate: 71
        }
      ];

      setRecommendations(mockRecommendations);

    } catch (error) {
      logger.error('Erro ao carregar recomendações', error instanceof Error ? error : new Error(String(error)), { component: 'SmartRecommendations' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadAutoOptimizations = async () => {
    const mockOptimizations: AutoOptimization[] = [
      {
        id: 'opt_1',
        name: 'Otimização Automática de Áudio',
        description: 'Normalização de volume, redução de ruído e otimização de frequências',
        status: 'available',
        progress: 0,
        estimatedTime: '3-5 minutos',
        impact: 'Melhoria de 25% na qualidade de áudio'
      },
      {
        id: 'opt_2',
        name: 'Compressão Inteligente de Vídeo',
        description: 'Redução de tamanho mantendo qualidade visual ideal',
        status: 'available',
        progress: 0,
        estimatedTime: '8-12 minutos',
        impact: 'Redução de 40% no tamanho sem perda perceptível'
      },
      {
        id: 'opt_3',
        name: 'Geração Automática de Legendas',
        description: 'Criação de legendas precisas com destaque de termos técnicos',
        status: 'completed',
        progress: 100,
        estimatedTime: 'Concluído',
        impact: 'Acessibilidade completa implementada'
      }
    ];

    setAutoOptimizations(mockOptimizations);
  };

  const handleApplyRecommendation = async (recommendationId: string) => {
    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (recommendation) {
      setAppliedRecommendations(prev => new Set([...prev, recommendationId]));
      toast.success(`Recomendação "${recommendation.title}" aplicada com sucesso!`);
      
      // Update recommendation statistics
      setRecommendations(prev => prev.map(r => 
        r.id === recommendationId 
          ? { ...r, appliedCount: r.appliedCount + 1 }
          : r
      ));
    }
  };

  const handleRunAutoOptimization = async (optimizationId: string) => {
    const optimization = autoOptimizations.find(opt => opt.id === optimizationId);
    if (optimization && optimization.status === 'available') {
      // Start optimization
      setAutoOptimizations(prev => prev.map(opt => 
        opt.id === optimizationId 
          ? { ...opt, status: 'running', progress: 0 }
          : opt
      ));

      // Simulate progress
      const interval = setInterval(() => {
        setAutoOptimizations(prev => prev.map(opt => {
          if (opt.id === optimizationId && opt.status === 'running') {
            const newProgress = Math.min(opt.progress + 20, 100);
            const newStatus = newProgress === 100 ? 'completed' : 'running';
            
            if (newProgress === 100) {
              toast.success(`${opt.name} concluída com sucesso!`);
            }
            
            return { ...opt, progress: newProgress, status: newStatus };
          }
          return opt;
        }));
      }, 1000);

      // Clear interval when completed
      setTimeout(() => {
        clearInterval(interval);
      }, 5000);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content': return <Brain className="h-4 w-4" />;
      case 'engagement': return <Users className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      case 'accessibility': return <Eye className="h-4 w-4" />;
      case 'structure': return <BarChart3 className="h-4 w-4" />;
      case 'compliance': return <CheckCircle className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getOptimizationStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'outline';
      case 'running': return 'secondary';
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-100 dark:from-amber-900 dark:via-orange-900 dark:to-red-900 transition-all duration-300">
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
              ✨ Smart Recommendations
            </h1>
            <p className="text-muted-foreground">
              Sugestões inteligentes baseadas em IA para otimizar seu conteúdo • {recommendations.length} recomendações
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="default" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              IA Preditiva
            </Badge>
            
            <Button onClick={loadSmartRecommendations} disabled={isAnalyzing} className="flex items-center gap-2">
              {isAnalyzing ? (
                <>
                  <Wand2 className="h-4 w-4 animate-pulse" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Gerar Novas
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={selectedCategory === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                Todas ({recommendations.length})
              </Button>
              {['engagement', 'content', 'accessibility', 'performance', 'structure', 'compliance'].map(category => {
                const count = recommendations.filter(r => r.category === category).length;
                return (
                  <Button 
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="capitalize"
                  >
                    {getCategoryIcon(category)}
                    <span className="ml-2">
                      {category === 'engagement' ? 'Engajamento' :
                       category === 'content' ? 'Conteúdo' :
                       category === 'accessibility' ? 'Acessibilidade' :
                       category === 'performance' ? 'Performance' :
                       category === 'structure' ? 'Estrutura' :
                       'Compliance'} ({count})
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Smart Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Recomendações Inteligentes ({filteredRecommendations.length})
                </CardTitle>
                <CardDescription>
                  Sugestões baseadas em análise avançada de IA e machine learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[800px]">
                  <div className="space-y-4">
                    {filteredRecommendations.map(rec => (
                      <Card key={rec.id} className="p-4 hover:shadow-md transition-shadow">
                        
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(rec.category)}
                            <div>
                              <h3 className="font-semibold">{rec.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(rec.priority)}>
                              {rec.priority === 'critical' ? 'Crítica' : 
                               rec.priority === 'high' ? 'Alta' : 
                               rec.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                            {appliedRecommendations.has(rec.id) && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aplicada
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Impacto</p>
                            <p className="font-bold text-green-600">{rec.impact}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Esforço</p>
                            <p className="font-bold text-blue-600">{rec.effort}min</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">ROI</p>
                            <p className="font-bold text-purple-600">{rec.roi}x</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Confiança</p>
                            <p className="font-bold text-orange-600">{rec.confidence}%</p>
                          </div>
                        </div>

                        {/* AI Reasoning */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">🧠 Análise da IA:</p>
                          <div className="space-y-1">
                            {rec.aiReasoning.map((reason, index) => (
                              <p key={index} className="text-xs text-muted-foreground">• {reason}</p>
                            ))}
                          </div>
                        </div>

                        {/* Expected Results */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">📈 Resultados Esperados:</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {rec.expectedResults.map((result, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                                <span>{result.metric}</span>
                                <span className="font-bold text-green-600">{result.improvement}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Implementation */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">⚙️ Implementação:</p>
                          <div className="space-y-1">
                            {rec.implementation.steps.map((step, index) => (
                              <p key={index} className="text-xs text-muted-foreground">
                                {index + 1}. {step}
                              </p>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rec.implementation.timeEstimate}
                            </span>
                            <span className="text-muted-foreground">
                              Aplicada {rec.appliedCount}x • {rec.successRate}% sucesso
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className={`h-3 w-3 ${rec.confidence > 85 ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                              Alta Confiança
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              ROI {rec.roi}x
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast.info('Detalhes completos da implementação...')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Detalhes
                            </Button>
                            
                            <Button 
                              size="sm"
                              onClick={() => handleApplyRecommendation(rec.id)}
                              disabled={appliedRecommendations.has(rec.id)}
                            >
                              {appliedRecommendations.has(rec.id) ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aplicada
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Aplicar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

          </div>

          {/* Sidebar - Auto Optimizations */}
          <div className="space-y-6">
            
            {/* Auto Optimizations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Otimizações Automáticas
                </CardTitle>
                <CardDescription>
                  Melhorias que podem ser aplicadas automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {autoOptimizations.map(opt => (
                  <Card key={opt.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{opt.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                        </div>
                        <Badge variant={getOptimizationStatusColor(opt.status)}>
                          {opt.status === 'available' ? 'Disponível' :
                           opt.status === 'running' ? 'Executando' :
                           opt.status === 'completed' ? 'Concluído' : 'Falhou'}
                        </Badge>
                      </div>
                      
                      {opt.status === 'running' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span>{opt.progress}%</span>
                          </div>
                          <Progress value={opt.progress} className="h-2" />
                        </div>
                      )}
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p><strong>Tempo:</strong> {opt.estimatedTime}</p>
                        <p><strong>Impacto:</strong> {opt.impact}</p>
                      </div>
                      
                      {opt.status === 'available' && (
                        <Button 
                          onClick={() => handleRunAutoOptimization(opt.id)}
                          size="sm" 
                          className="w-full"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Executar Agora
                        </Button>
                      )}
                      
                      {opt.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          disabled
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Concluído
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-2xl font-bold text-green-600">{appliedRecommendations.size}</p>
                    <p className="text-xs text-muted-foreground">Aplicadas</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-2xl font-bold text-blue-600">{recommendations.length - appliedRecommendations.size}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-2xl font-bold text-purple-600">2.4x</p>
                    <p className="text-xs text-muted-foreground">ROI Médio</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-2xl font-bold text-orange-600">87%</p>
                    <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
};

export default SmartRecommendations;
