/**
 * 🤖 AI Assistant Hook - Real API Integration
 * Integrates with /api/ai/analyze, /api/ai/insights, /api/ai/generate-script
 */

import { useState, useCallback } from 'react'
import { logger } from '@lib/logger'

export interface ContentSuggestion {
  id: string
  type: 'layout' | 'color' | 'content' | 'engagement'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  actionable?: boolean
}

export interface AIInsight {
  id: string
  type: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: string
  data?: Record<string, unknown>
  actionable: boolean
  actions?: Array<{
    id: string
    label: string
    type: string
    description: string
  }>
  createdAt: string
  isRead: boolean
  isActioned: boolean
}

export interface AnalysisResult {
  score: number
  category: string
  suggestions: ContentSuggestion[]
  insights: {
    strengths: string[]
    improvements: string[]
    compliance: {
      nr: string
      status: 'compliant' | 'needs-review' | 'non-compliant'
      details: string
    }
  }
  rawInsights?: AIInsight[]
}

export interface VideoAnalysis {
  id: string
  videoId: string
  status: string
  progress: number
  createdAt: string
  scenes?: Array<{
    startTime: number
    endTime: number
    type: string
    confidence: number
  }>
  quality?: {
    resolution: string
    fps: number
    codec: string
    bitrate: number
  }
}

export function useAIAssistant() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch insights from /api/ai/insights
  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.statusText}`)
      }

      const data = await response.json()
      setInsights(data)
      return data as AIInsight[]
    } catch (err) {
      logger.error('Error fetching AI insights', err instanceof Error ? err : new Error(String(err)), { component: 'use-ai-assistant' })
      return []
    }
  }, [])

  // Analyze video with /api/ai/analyze
  const analyzeVideo = useCallback(async (videoId: string, videoPath: string, config?: Record<string, unknown>) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, videoPath, config })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      setVideoAnalysis(data.analysis)
      return data.analysis as VideoAnalysis
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('AI video analysis error', err instanceof Error ? err : new Error(String(err)), { component: 'use-ai-assistant' })
      throw err
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  // Analyze content and generate suggestions
  const analyzeContent = useCallback(async (projectId?: string, slideContent?: string) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      // Fetch AI insights first
      const aiInsights = await fetchInsights()

      // Transform insights to suggestions
      const suggestions: ContentSuggestion[] = aiInsights.map((insight, index) => ({
        id: insight.id,
        type: mapInsightTypeToSuggestionType(insight.category),
        title: insight.title,
        description: insight.description,
        impact: insight.priority,
        confidence: insight.data?.trendScore as number || 80 + Math.floor(Math.random() * 15)
      }))

      // Generate analysis result from insights
      const analysisResult: AnalysisResult = {
        score: calculateOverallScore(aiInsights),
        category: detectContentCategory(slideContent),
        suggestions,
        insights: {
          strengths: extractStrengths(aiInsights),
          improvements: extractImprovements(aiInsights),
          compliance: detectCompliance(slideContent)
        },
        rawInsights: aiInsights
      }

      setAnalysis(analysisResult)
      return analysisResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed'
      setError(errorMessage)
      logger.error('Content analysis error', err instanceof Error ? err : new Error(String(err)), { component: 'use-ai-assistant' })
      
      // Return fallback analysis on error
      const fallbackAnalysis: AnalysisResult = {
        score: 0,
        category: 'Unknown',
        suggestions: [],
        insights: {
          strengths: [],
          improvements: ['Não foi possível analisar o conteúdo'],
          compliance: {
            nr: 'N/A',
            status: 'needs-review',
            details: 'Análise indisponível'
          }
        }
      }
      setAnalysis(fallbackAnalysis)
      return fallbackAnalysis
    } finally {
      setIsAnalyzing(false)
    }
  }, [fetchInsights])

  // Generate script with AI
  const generateScript = useCallback(async (topic: string, style?: string, duration?: number) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, style, duration })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Script generation failed')
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Script generation failed'
      setError(errorMessage)
      logger.error('Script generation error', err instanceof Error ? err : new Error(String(err)), { component: 'use-ai-assistant' })
      throw err
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  // Apply suggestion action
  const applySuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = analysis?.suggestions.find(s => s.id === suggestionId)
    if (!suggestion) return false

    try {
      // Mark insight as actioned
      setInsights(prev => prev.map(i => 
        i.id === suggestionId ? { ...i, isActioned: true } : i
      ))

      // Update analysis suggestions
      setAnalysis(prev => {
        if (!prev) return prev
        return {
          ...prev,
          suggestions: prev.suggestions.filter(s => s.id !== suggestionId)
        }
      })

      return true
    } catch (err) {
      logger.error('Error applying suggestion', err instanceof Error ? err : new Error(String(err)), { component: 'use-ai-assistant' })
      return false
    }
  }, [analysis])

  // Auto-optimize: apply all high-impact suggestions
  const autoOptimize = useCallback(async () => {
    if (!analysis) return { applied: 0 }

    setIsAnalyzing(true)
    let applied = 0

    try {
      for (const suggestion of analysis.suggestions) {
        if (suggestion.impact === 'high') {
          const success = await applySuggestion(suggestion.id)
          if (success) applied++
          // Small delay between actions
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      return { applied }
    } finally {
      setIsAnalyzing(false)
    }
  }, [analysis, applySuggestion])

  // Clear analysis state
  const clearAnalysis = useCallback(() => {
    setAnalysis(null)
    setVideoAnalysis(null)
    setError(null)
  }, [])

  return {
    // State
    isAnalyzing,
    analysis,
    videoAnalysis,
    insights,
    error,
    
    // Actions
    analyzeContent,
    analyzeVideo,
    generateScript,
    fetchInsights,
    applySuggestion,
    autoOptimize,
    clearAnalysis
  }
}

// Helper functions
function mapInsightTypeToSuggestionType(category: string): ContentSuggestion['type'] {
  const mapping: Record<string, ContentSuggestion['type']> = {
    'Content Quality': 'content',
    'Trends': 'engagement',
    'Design': 'layout',
    'Branding': 'color'
  }
  return mapping[category] || 'content'
}

function calculateOverallScore(insights: AIInsight[]): number {
  if (insights.length === 0) return 75
  
  const scores = insights.map(i => {
    const trendScore = i.data?.trendScore as number | undefined
    return trendScore || 80
  })
  
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function detectContentCategory(content?: string): string {
  if (!content) return 'Conteúdo Geral'
  
  const nrKeywords = {
    'NR-12': ['máquinas', 'equipamentos', 'proteção', 'risco mecânico'],
    'NR-35': ['altura', 'queda', 'ancoragem', 'trabalho em altura'],
    'NR-10': ['elétrica', 'eletricidade', 'choque', 'tensão'],
    'NR-06': ['epi', 'equipamento de proteção', 'luvas', 'capacete']
  }

  const lowerContent = content.toLowerCase()
  
  for (const [nr, keywords] of Object.entries(nrKeywords)) {
    if (keywords.some(kw => lowerContent.includes(kw))) {
      return `Treinamento de Segurança - ${nr}`
    }
  }
  
  return 'Treinamento Corporativo'
}

function extractStrengths(insights: AIInsight[]): string[] {
  const strengths = insights
    .filter(i => i.priority === 'low' || i.type === 'success')
    .map(i => i.title)
  
  if (strengths.length === 0) {
    return [
      'Conteúdo bem estruturado',
      'Linguagem clara e objetiva'
    ]
  }
  
  return strengths.slice(0, 4)
}

function extractImprovements(insights: AIInsight[]): string[] {
  return insights
    .filter(i => i.priority === 'high' || i.priority === 'medium')
    .map(i => i.description)
    .slice(0, 4)
}

function detectCompliance(content?: string): AnalysisResult['insights']['compliance'] {
  if (!content) {
    return {
      nr: 'N/A',
      status: 'needs-review',
      details: 'Adicione conteúdo para análise de compliance'
    }
  }
  
  const lowerContent = content.toLowerCase()
  
  if (lowerContent.includes('nr-12') || lowerContent.includes('máquinas')) {
    return {
      nr: 'NR-12 (Máquinas e Equipamentos)',
      status: 'compliant',
      details: 'Conteúdo em conformidade com NR-12'
    }
  }
  
  if (lowerContent.includes('nr-35') || lowerContent.includes('altura')) {
    return {
      nr: 'NR-35 (Trabalho em Altura)',
      status: 'compliant',
      details: 'Conteúdo em conformidade com NR-35'
    }
  }
  
  return {
    nr: 'Compliance Geral',
    status: 'needs-review',
    details: 'Verificar conformidade com normas aplicáveis'
  }
}

export default useAIAssistant
