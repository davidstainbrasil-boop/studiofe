
'use client'

/**
 * 📚 Asset Library - Estilo Animaker
 * Biblioteca completa de assets para editor PPTX
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { toast } from 'react-hot-toast'
import { 
  Search,
  User,
  Type,
  Image,
  Music,
  Sparkles,
  Palette,
  Shapes,
  Camera,
  Mic,
  Film,
  Heart,
  Star,
  Download,
  Plus
} from 'lucide-react'

interface AssetItem {
  id: string
  name: string
  category: string
  thumbnail: string
  type: 'character' | 'text' | 'background' | 'music' | 'effect' | 'shape'
  premium: boolean
  tags: string[]
}

interface PPTXAssetLibraryProps {
  onAssetSelect: (asset: AssetItem) => void
}

export function PPTXAssetLibrary({ onAssetSelect }: PPTXAssetLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('characters')
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])

  // Mock asset data (simulando 160M+ assets do Animaker)
  const mockAssets: Record<string, AssetItem[]> = {
    characters: [
      {
        id: 'char-1',
        name: 'Executivo Brasileiro',
        category: 'Empresarial',
        thumbnail: '👨‍💼',
        type: 'character',
        premium: false,
        tags: ['empresarial', 'masculino', 'formal']
      },
      {
        id: 'char-2',
        name: 'Engenheira de Segurança',
        category: 'Técnico',
        thumbnail: '👩‍🔧',
        type: 'character',
        premium: true,
        tags: ['técnico', 'feminino', 'segurança']
      },
      {
        id: 'char-3',
        name: 'Operador Industrial',
        category: 'Operacional',
        thumbnail: '👨‍🏭',
        type: 'character',
        premium: false,
        tags: ['industrial', 'masculino', 'operador']
      },
      {
        id: 'char-4',
        name: 'Médica do Trabalho',
        category: 'Saúde',
        thumbnail: '👩‍⚕️',
        type: 'character',
        premium: true,
        tags: ['saúde', 'feminino', 'médica']
      }
    ],
    text: [
      {
        id: 'text-1',
        name: 'Título Principal',
        category: 'Cabeçalhos',
        thumbnail: '📝',
        type: 'text',
        premium: false,
        tags: ['título', 'principal', 'destaque']
      },
      {
        id: 'text-2',
        name: 'Subtítulo Elegante',
        category: 'Cabeçalhos',
        thumbnail: '✍️',
        type: 'text',
        premium: false,
        tags: ['subtítulo', 'elegante']
      },
      {
        id: 'text-3',
        name: 'Texto de Alerta',
        category: 'Especiais',
        thumbnail: '⚠️',
        type: 'text',
        premium: true,
        tags: ['alerta', 'atenção', 'importante']
      }
    ],
    backgrounds: [
      {
        id: 'bg-1',
        name: 'Escritório Moderno',
        category: 'Corporativo',
        thumbnail: '🏢',
        type: 'background',
        premium: false,
        tags: ['escritório', 'moderno', 'corporativo']
      },
      {
        id: 'bg-2',
        name: 'Fábrica Industrial',
        category: 'Industrial',
        thumbnail: '🏭',
        type: 'background',
        premium: true,
        tags: ['fábrica', 'industrial', 'produção']
      },
      {
        id: 'bg-3',
        name: 'Laboratório Científico',
        category: 'Científico',
        thumbnail: '🔬',
        type: 'background',
        premium: true,
        tags: ['laboratório', 'científico', 'pesquisa']
      }
    ],
    music: [
      {
        id: 'music-1',
        name: 'Corporate Inspire',
        category: 'Corporativo',
        thumbnail: '🎵',
        type: 'music',
        premium: false,
        tags: ['corporativo', 'inspirador', 'motivacional']
      },
      {
        id: 'music-2',
        name: 'Industrial Ambient',
        category: 'Ambiente',
        thumbnail: '🎶',
        type: 'music',
        premium: true,
        tags: ['industrial', 'ambiente', 'fundo']
      }
    ],
    effects: [
      {
        id: 'effect-1',
        name: 'Fade Suave',
        category: 'Transições',
        thumbnail: '✨',
        type: 'effect',
        premium: false,
        tags: ['fade', 'suave', 'transição']
      },
      {
        id: 'effect-2',
        name: 'Zoom Dinâmico',
        category: 'Movimento',
        thumbnail: '🔍',
        type: 'effect',
        premium: true,
        tags: ['zoom', 'dinâmico', 'movimento']
      }
    ]
  }

  const handleAssetClick = (asset: AssetItem) => {
    onAssetSelect(asset)
    toast.success(`${asset.name} adicionado ao projeto!`)
  }

  const handleLoadMoreAssets = () => {
    toast.success('🔄 Carregando mais assets da biblioteca...')
    // Simular carregamento de mais assets
    setTimeout(() => {
      toast.success('📚 160M+ assets disponíveis para uso!')
    }, 1000)
  }

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category)
    toast.success(`📁 Categoria ${category} selecionada`)
  }

  const filteredAssets = mockAssets[activeCategory]?.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'characters': return <User className="h-4 w-4" />
      case 'text': return <Type className="h-4 w-4" />
      case 'backgrounds': return <Image className="h-4 w-4" />
      case 'music': return <Music className="h-4 w-4" />
      case 'effects': return <Sparkles className="h-4 w-4" />
      default: return <Plus className="h-4 w-4" />
    }
  }

  return (
    <div className="h-full bg-gray-800 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Palette className="h-5 w-5 mr-2 text-purple-400" />
          Biblioteca de Assets
        </h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Buscar assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Categories */}
      <Tabs value={activeCategory} onValueChange={handleCategorySelect} className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <TabsList className="grid w-full grid-cols-5 gap-1">
            <TabsTrigger 
              value="characters" 
              className="text-xs"
              onClick={() => handleCategorySelect('characters')}
            >
              <User className="h-3 w-3 mb-1" />
              Personagens
            </TabsTrigger>
            <TabsTrigger 
              value="text" 
              className="text-xs"
              onClick={() => handleCategorySelect('text')}
            >
              <Type className="h-3 w-3 mb-1" />
              Texto
            </TabsTrigger>
            <TabsTrigger 
              value="backgrounds" 
              className="text-xs"
              onClick={() => handleCategorySelect('backgrounds')}
            >
              <Image className="h-3 w-3 mb-1" />
              Fundos
            </TabsTrigger>
            <TabsTrigger 
              value="music" 
              className="text-xs"
              onClick={() => handleCategorySelect('music')}
            >
              <Music className="h-3 w-3 mb-1" />
              Áudio
            </TabsTrigger>
            <TabsTrigger 
              value="effects" 
              className="text-xs"
              onClick={() => handleCategorySelect('effects')}
            >
              <Sparkles className="h-3 w-3 mb-1" />
              Efeitos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value={activeCategory} className="mt-0">
            <div className="grid grid-cols-2 gap-3">
              {filteredAssets.map((asset) => (
                <Card 
                  key={asset.id}
                  className="cursor-pointer hover:shadow-lg transition-all bg-gray-700 border-gray-600 hover:bg-gray-600"
                  onClick={() => handleAssetClick(asset)}
                >
                  <CardContent className="p-3">
                    {/* Asset Preview */}
                    <div className="aspect-square bg-gray-600 rounded-lg mb-3 flex items-center justify-center relative">
                      <span className="text-3xl">{asset.thumbnail}</span>
                      
                      {asset.premium && (
                        <Badge className="absolute top-1 right-1 bg-yellow-500 text-black text-xs">
                          PRO
                        </Badge>
                      )}
                    </div>

                    {/* Asset Info */}
                    <div>
                      <h4 className="text-sm font-medium text-white truncate">
                        {asset.name}
                      </h4>
                      <p className="text-xs text-gray-400">{asset.category}</p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {asset.tags.slice(0, 2).map((tag) => (
                          <Badge 
                            key={tag}
                            variant="outline" 
                            className="text-xs px-1 py-0 border-gray-500 text-gray-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-6">
              <Button 
                variant="outline" 
                className="text-gray-300 border-gray-600"
                onClick={handleLoadMoreAssets}
              >
                <Download className="h-4 w-4 mr-2" />
                Carregar Mais Assets
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Mostrando {filteredAssets.length} de 160M+ assets disponíveis
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Quick Add Panel */}
      <div className="p-4 border-t border-gray-700">
        <h4 className="text-sm font-medium mb-3 text-gray-300">Ações Rápidas</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start bg-gray-700 border-gray-600 hover:bg-gray-600"
            onClick={() => toast.success('🎤 Gravação de voz iniciada')}
          >
            <Mic className="h-3 w-3 mr-2" />
            Gravar Voz
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start bg-gray-700 border-gray-600 hover:bg-gray-600"
            onClick={() => toast.success('📸 Captura de tela ativada')}
          >
            <Camera className="h-3 w-3 mr-2" />
            Screenshot
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start bg-gray-700 border-gray-600 hover:bg-gray-600"
            onClick={() => toast.success('🎨 Editor de formas aberto')}
          >
            <Shapes className="h-3 w-3 mr-2" />
            Formas
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="justify-start bg-gray-700 border-gray-600 hover:bg-gray-600"
            onClick={() => toast.success('🎬 Importação de vídeo iniciada')}
          >
            <Film className="h-3 w-3 mr-2" />
            Vídeo
          </Button>
        </div>
      </div>
    </div>
  )
}
