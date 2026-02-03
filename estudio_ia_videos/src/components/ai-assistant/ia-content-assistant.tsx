
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Brain, 
  Wand2, 
  Palette, 
  Zap, 
  TrendingUp, 
  Target, 
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layout,
  Eye,
  BarChart3,
  Lightbulb,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAIAssistant, type ContentSuggestion, type AnalysisResult } from '@hooks/use-ai-assistant'

export default function IAContentAssistant() {
  const {
    isAnalyzing,
    analysis,
    error,
    analyzeContent,
    applySuggestion,
    autoOptimize
  } = useAIAssistant()
  
  const [activeTab, setActiveTab] = useState('suggestions')

  // Handle analysis
  const handleAnalyze = async () => {
    try {
      await analyzeContent()
      toast.success('Análise IA concluída!')
    } catch {
      toast.error('Erro ao analisar conteúdo')
    }
  }

  // Handle auto-optimization
  const handleAutoOptimize = async () => {
    if (!analysis) return

    try {
      const result = await autoOptimize()
      if (result.applied > 0) {
        toast.success(`${result.applied} otimizações aplicadas!`)
      } else {
        toast('Nenhuma otimização de alto impacto disponível')
      }
    } catch {
      toast.error('Erro na auto-otimização')
    }
  }

  // Handle suggestion application
  const handleApplySuggestion = async (suggestion: ContentSuggestion) => {
    try {
      const success = await applySuggestion(suggestion.id)
      if (success) {
        toast.success(`${suggestion.title} aplicado!`)
      }
    } catch {
      toast.error('Erro ao aplicar sugestão')
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600'
      case 'needs-review': return 'text-yellow-600'
      case 'non-compliant': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header do Assistente IA */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-600 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-purple-900">
                  Assistente IA de Conteúdo
                </CardTitle>
                <p className="text-purple-700 mt-1">
                  Análise inteligente e otimização automática de conteúdo
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Analisar Conteúdo
              </Button>
              {analysis && (
                <Button 
                  onClick={handleAutoOptimize}
                  variant="outline"
                  disabled={isAnalyzing}
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Auto-Otimizar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {isAnalyzing && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="animate-spin mx-auto">
                <Brain className="h-12 w-12 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Analisando conteúdo com IA...</h3>
                <p className="text-gray-600">Processando layout, cores, texto e compliance</p>
              </div>
              <Progress value={75} className="w-full max-w-md mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados da Análise */}
      {analysis && !isAnalyzing && (
        <div className="space-y-6">
          {/* Score Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Score de Qualidade</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-purple-600">
                    {analysis.score}/100
                  </span>
                  <Badge className="bg-purple-100 text-purple-800">
                    {analysis.category}
                  </Badge>
                </div>
                <Progress value={analysis.score} className="h-3" />
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Qualidade Excelente - Pronto para produção</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de Análise Detalhada */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="suggestions">
                <Sparkles className="h-4 w-4 mr-2" />
                Sugestões IA
              </TabsTrigger>
              <TabsTrigger value="insights">
                <Lightbulb className="h-4 w-4 mr-2" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="compliance">
                <Target className="h-4 w-4 mr-2" />
                Compliance NR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suggestions" className="space-y-4">
              {analysis.suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {suggestion.type === 'layout' && <Layout className="h-5 w-5 text-blue-600" />}
                          {suggestion.type === 'color' && <Palette className="h-5 w-5 text-green-600" />}
                          {suggestion.type === 'content' && <Eye className="h-5 w-5 text-orange-600" />}
                          {suggestion.type === 'engagement' && <TrendingUp className="h-5 w-5 text-purple-600" />}
                          
                          <h3 className="font-semibold">{suggestion.title}</h3>
                          <Badge className={getImpactColor(suggestion.impact)}>
                            {suggestion.impact} impact
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{suggestion.description}</p>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500">Confiança:</span>
                          <Progress value={suggestion.confidence} className="w-20 h-2" />
                          <span className="text-gray-700 font-medium">{suggestion.confidence}%</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleApplySuggestion(suggestion)}
                        size="sm"
                        className="ml-4"
                      >
                        Aplicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Pontos Fortes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700 flex items-center">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Pontos Fortes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.insights.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Melhorias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-orange-700 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Oportunidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.insights.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Análise de Compliance NR
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <h3 className="font-semibold text-green-800">
                        {analysis.insights.compliance.nr}
                      </h3>
                      <p className="text-green-700 mt-1">
                        {analysis.insights.compliance.details}
                      </p>
                    </div>
                    <Badge className={`${getComplianceColor(analysis.insights.compliance.status)} bg-green-100 border-green-300`}>
                      {analysis.insights.compliance.status === 'compliant' ? '✓ Conforme' : 
                       analysis.insights.compliance.status === 'needs-review' ? '⚠ Revisar' : '✗ Não Conforme'}
                    </Badge>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Recomendações NR</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Incluir avisos de segurança obrigatórios</li>
                      <li>• Destacar procedimentos de emergência</li>
                      <li>• Adicionar checklist de verificação</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
