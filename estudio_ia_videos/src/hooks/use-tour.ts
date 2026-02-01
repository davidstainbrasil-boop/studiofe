import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface TourState {
  hasCompletedTour: boolean
  currentStep: number
  isActive: boolean
  completedAt: string | null
}

export interface UseTourReturn {
  state: TourState
  startTour: () => void
  endTour: () => void
  skipTour: () => void
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  resetTour: () => void
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'editor-tour-state'

const DEFAULT_STATE: TourState = {
  hasCompletedTour: false,
  currentStep: 0,
  isActive: false,
  completedAt: null,
}

// =============================================================================
// Hook
// =============================================================================

export function useTour(totalSteps: number = 9): UseTourReturn {
  const [state, setState] = useState<TourState>(DEFAULT_STATE)

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as TourState
        setState(parsed)
      } catch (error) {
        console.error('Failed to parse tour state:', error)
      }
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const startTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }))
  }, [])

  const endTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      hasCompletedTour: true,
      completedAt: new Date().toISOString(),
    }))
  }, [])

  const skipTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
    }))
  }, [])

  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= totalSteps) return
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }))
  }, [totalSteps])

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextStepNum = prev.currentStep + 1
      if (nextStepNum >= totalSteps) {
        // Complete the tour
        return {
          ...prev,
          isActive: false,
          hasCompletedTour: true,
          completedAt: new Date().toISOString(),
        }
      }
      return {
        ...prev,
        currentStep: nextStepNum,
      }
    })
  }, [totalSteps])

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }))
  }, [])

  const resetTour = useCallback(() => {
    setState(DEFAULT_STATE)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return {
    state,
    startTour,
    endTour,
    skipTour,
    goToStep,
    nextStep,
    prevStep,
    resetTour,
  }
}

// =============================================================================
// Tour Steps Definition
// =============================================================================

export interface TourStep {
  id: string
  title: string
  description: string
  targetSelector?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  spotlightPadding?: number
  nextLabel?: string
  backLabel?: string
}

export const EDITOR_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Editor!',
    description: 'Este é o seu espaço de criação. Vamos conhecer as principais ferramentas.',
    position: 'center',
    nextLabel: 'Vamos começar',
  },
  {
    id: 'timeline',
    title: 'Timeline',
    description: 'Aqui você organiza a sequência dos seus slides. Arraste para reordenar.',
    targetSelector: '#editor-timeline',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'canvas',
    title: 'Canvas de Edição',
    description: 'Visualize e edite o conteúdo do slide selecionado. Clique nos elementos para modificar.',
    targetSelector: '#editor-canvas',
    position: 'right',
    spotlightPadding: 12,
  },
  {
    id: 'tools',
    title: 'Barra de Ferramentas',
    description: 'Adicione textos, formas, imagens e muito mais ao seu slide.',
    targetSelector: '#editor-toolbar',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'properties',
    title: 'Painel de Propriedades',
    description: 'Configure cores, fontes, animações e outras propriedades do elemento selecionado.',
    targetSelector: '#editor-properties',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'narration',
    title: 'Narração com IA',
    description: 'Clique aqui para gerar narração automática a partir do texto do slide.',
    targetSelector: '#narration-button',
    position: 'bottom',
    spotlightPadding: 4,
  },
  {
    id: 'transitions',
    title: 'Transições',
    description: 'Adicione transições suaves entre os slides. Escolha entre fade, slide, zoom e mais.',
    targetSelector: '#transition-button',
    position: 'bottom',
    spotlightPadding: 4,
  },
  {
    id: 'preview',
    title: 'Pré-visualização',
    description: 'Clique para ver como ficará seu vídeo antes de renderizar.',
    targetSelector: '#preview-button',
    position: 'bottom',
    spotlightPadding: 4,
  },
  {
    id: 'export',
    title: 'Exportar Vídeo',
    description: 'Quando estiver satisfeito, clique aqui para renderizar seu vídeo em alta qualidade.',
    targetSelector: '#export-button',
    position: 'bottom',
    spotlightPadding: 4,
    nextLabel: 'Entendi!',
  },
]

// =============================================================================
// Exports
// =============================================================================

export default useTour
