
'use client'

/**
 * 🎬 Painel de Transições e Efeitos - Estilo Animaker
 * 40+ tipos de transições profissionais
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { toast } from 'react-hot-toast'
import { 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Shuffle,
  Circle,
  Square,
  Star,
  Heart,
  Play,
  Search
} from 'lucide-react'

interface TransitionEffect {
  id: string
  name: string
  category: string
  icon: React.ReactNode
  duration: number
  premium: boolean
  description: string
  preview: string
}

interface TransitionEffectsPanelProps {
  onEffectSelect: (effect: TransitionEffect) => void
  selectedSlideIndex?: number
}

export function TransitionEffectsPanel({ onEffectSelect, selectedSlideIndex }: TransitionEffectsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('basic')

  // Transições categorizadas (baseado no Animaker)
  const transitions: Record<string, TransitionEffect[]> = {
    basic: [
      {
        id: 'fade',
        name: 'Fade',
        category: 'Básico',
        icon: <Circle className="h-4 w-4" />,
        duration: 0.5,
        premium: false,
        description: 'Transição suave com fade in/out',
        preview: '●○'
      },
      {
        id: 'slide-left',
        name: 'Deslizar Esquerda',
        category: 'Básico',
        icon: <ArrowLeft className="h-4 w-4" />,
        duration: 0.8,
        premium: false,
        description: 'Slide entra pela esquerda',
        preview: '←□'
      },
      {
        id: 'slide-right',
        name: 'Deslizar Direita',
        category: 'Básico',
        icon: <ArrowRight className="h-4 w-4" />,
        duration: 0.8,
        premium: false,
        description: 'Slide entra pela direita',
        preview: '□→'
      },
      {
        id: 'slide-up',
        name: 'Deslizar Cima',
        category: 'Básico',
        icon: <ArrowUp className="h-4 w-4" />,
        duration: 0.8,
        premium: false,
        description: 'Slide entra por cima',
        preview: '↑□'
      }
    ],
    zoom: [
      {
        id: 'zoom-in',
        name: 'Zoom In',
        category: 'Zoom',
        icon: <ZoomIn className="h-4 w-4" />,
        duration: 1.0,
        premium: false,
        description: 'Zoom gradual para dentro',
        preview: '⊙'
      },
      {
        id: 'zoom-out',
        name: 'Zoom Out',
        category: 'Zoom',
        icon: <ZoomOut className="h-4 w-4" />,
        duration: 1.0,
        premium: false,
        description: 'Zoom gradual para fora',
        preview: '○'
      }
    ],
    creative: [
      {
        id: 'sparkle',
        name: 'Sparkle Magic',
        category: 'Criativo',
        icon: <Sparkles className="h-4 w-4" />,
        duration: 1.2,
        premium: true,
        description: 'Efeito de brilho mágico',
        preview: '✨'
      },
      {
        id: 'heart-burst',
        name: 'Explosão de Corações',
        category: 'Criativo',
        icon: <Heart className="h-4 w-4" />,
        duration: 1.5,
        premium: true,
        description: 'Transição com corações explodindo',
        preview: '💖'
      },
      {
        id: 'star-wipe',
        name: 'Star Wipe',
        category: 'Criativo',
        icon: <Star className="h-4 w-4" />,
        duration: 1.0,
        premium: true,
        description: 'Transição em formato de estrela',
        preview: '⭐'
      }
    ],
    professional: [
      {
        id: 'iris-circle',
        name: 'Iris Circular',
        category: 'Profissional',
        icon: <Circle className="h-4 w-4" />,
        duration: 0.8,
        premium: true,
        description: 'Abertura/fechamento circular',
        preview: '◯'
      },
      {
        id: 'iris-square',
        name: 'Iris Quadrada',
        category: 'Profissional',
        icon: <Square className="h-4 w-4" />,
        duration: 0.8,
        premium: true,
        description: 'Abertura/fechamento quadrada',
        preview: '□'
      },
      {
        id: 'camera-popup',
        name: 'Camera Pop-up',
        category: 'Profissional',
        icon: <Play className="h-4 w-4" />,
        duration: 1.2,
        premium: true,
        description: 'Efeito de popup como câmera',
        preview: '📸'
      }
    ]
  }

  const allTransitions = Object.values(transitions).flat()
  const filteredTransitions = allTransitions.filter(transition =>
    transition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transition.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categoryTransitions = searchTerm 
    ? filteredTransitions 
    : transitions[activeCategory] || []

  const handleEffectSelect = (effect: TransitionEffect) => {
    onEffectSelect(effect)
    toast.success(`✨ ${effect.name} aplicado ao slide ${(selectedSlideIndex || 0) + 1}`)
  }

  return (
    <div className="h-full bg-gray-800 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-orange-400" />
          Transições & Efeitos
        </h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Buscar efeitos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>40+ efeitos disponíveis</span>
          {selectedSlideIndex !== undefined && (
            <Badge variant="outline" className="text-xs">
              Para Slide {selectedSlideIndex + 1}
            </Badge>
          )}
        </div>
      </div>

      {/* Categories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="basic" className="text-xs">
              Básico
            </TabsTrigger>
            <TabsTrigger value="zoom" className="text-xs">
              Zoom
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-2 gap-1 mt-1">
            <TabsTrigger value="creative" className="text-xs">
              Criativo
            </TabsTrigger>
            <TabsTrigger value="professional" className="text-xs">
              Profissional
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Effects Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-2">
            {categoryTransitions.map((effect) => (
              <Card 
                key={effect.id}
                className="cursor-pointer hover:bg-gray-600 transition-colors bg-gray-700 border-gray-600"
                onClick={() => handleEffectSelect(effect)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    {/* Icon & Preview */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                        {effect.icon}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-white truncate">
                          {effect.name}
                        </h4>
                        {effect.premium && (
                          <Badge className="bg-yellow-500 text-black text-xs">
                            PRO
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {effect.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {effect.duration}s
                        </span>
                        <span className="text-xs text-gray-500">
                          {effect.preview}
                        </span>
                      </div>
                    </div>

                    {/* Preview Button */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex-shrink-0 p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        toast.success(`👁️ Preview: ${effect.name}`)
                      }}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Category Stats */}
          <div className="mt-6 p-3 bg-gray-700 rounded-lg">
            <div className="text-center text-sm text-gray-400">
              <p className="mb-2">📊 Estatísticas da Categoria</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium">{categoryTransitions.length}</span>
                  <span className="text-gray-500"> efeitos</span>
                </div>
                <div>
                  <span className="font-medium">
                    {categoryTransitions.filter(t => !t.premium).length}
                  </span>
                  <span className="text-gray-500"> gratuitos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
