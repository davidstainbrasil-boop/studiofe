// TODO: Fixar tipos de estilo/gender/age após estabilizar enums
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Textarea } from '@components/ui/textarea'
import { Badge } from '@components/ui/badge'
import { Progress } from '@components/ui/progress'
import { Separator } from '@components/ui/separator'
import { Alert, AlertDescription } from '@components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import { Slider } from '@components/ui/slider'
import { 
  User, 
  Wand2, 
  Play, 
  Pause, 
  Download, 
  Settings, 
  Eye, 
  Palette, 
  Smile, 
  Hand, 
  Volume2,
  Video,
  Save,
  RefreshCw,
  Sparkles,
  Camera,
  Mic,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain,
  Library
} from 'lucide-react'

import VoiceCloningIntegration from './VoiceCloningIntegration'
import AppearanceCustomizer from './AppearanceCustomizer'
import PersonalityPresets from './PersonalityPresets'
import RealTimeRenderer from './RealTimeRenderer'

interface Avatar3D {
  id: string
  name: string
  description: string
  status: 'generating' | 'ready' | 'error'
  thumbnail: string
  created_at: string
  style: 'realistic' | 'cartoon' | 'professional' | 'casual'
  gender: 'male' | 'female' | 'neutral'
  age_range: 'young' | 'adult' | 'senior'
  ethnicity: string
  customizations: {
    hair_color: string
    hair_style: string
    skin_tone: string
    eye_color: string
    clothing_style: string
    accessories: string[]
  }
}

interface AvatarConfig {
  name: string
  description: string
  style: 'realistic' | 'cartoon' | 'professional' | 'casual'
  gender: 'male' | 'female' | 'neutral'
  age_range: 'young' | 'adult' | 'senior'
  ethnicity: string
  hair_color: string
  hair_style: string
  skin_tone: string
  eye_color: string
  clothing_style: string
  accessories: string[]
}

interface FacialExpression {
  id: string
  name: string
  description: string
  intensity: number
  duration: number
  trigger_words: string[]
}

interface Gesture {
  id: string
  name: string
  description: string
  body_parts: string[]
  duration: number
  intensity: number
}

export default function AvatarSystemReal() {
  const [activeTab, setActiveTab] = useState('generator')
  const [avatars, setAvatars] = useState<Avatar3D[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar3D | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados para geração de avatar
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    name: '',
    description: '',
    style: 'realistic',
    gender: 'neutral',
    age_range: 'adult',
    ethnicity: 'mixed',
    hair_color: '#8B4513',
    hair_style: 'short',
    skin_tone: '#F5DEB3',
    eye_color: '#8B4513',
    clothing_style: 'professional',
    accessories: []
  })
  
  // Estados para animação
  const [selectedExpression, setSelectedExpression] = useState('')
  const [selectedGesture, setSelectedGesture] = useState('')
  const [animationIntensity, setAnimationIntensity] = useState(50)
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Estados para lip-sync
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [lipSyncProgress, setLipSyncProgress] = useState(0)
  const [isGeneratingLipSync, setIsGeneratingLipSync] = useState(false)
  
  // Estados para renderização
  const [renderSettings, setRenderSettings] = useState({
    resolution: '1920x1080',
    fps: 30,
    quality: 'high',
    background: 'transparent',
    lighting: 'studio'
  })
  
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)

  // Expressões faciais disponíveis
  const facialExpressions: FacialExpression[] = [
    {
      id: 'happy',
      name: 'Feliz',
      description: 'Expressão alegre e sorridente',
      intensity: 80,
      duration: 2000,
      trigger_words: ['feliz', 'alegre', 'contente', 'sorriso']
    },
    {
      id: 'serious',
      name: 'Sério',
      description: 'Expressão concentrada e profissional',
      intensity: 70,
      duration: 3000,
      trigger_words: ['sério', 'importante', 'atenção', 'foco']
    },
    {
      id: 'surprised',
      name: 'Surpreso',
      description: 'Expressão de surpresa ou admiração',
      intensity: 90,
      duration: 1500,
      trigger_words: ['surpresa', 'incrível', 'uau', 'impressionante']
    },
    {
      id: 'thoughtful',
      name: 'Pensativo',
      description: 'Expressão reflexiva e contemplativa',
      intensity: 60,
      duration: 4000,
      trigger_words: ['pensar', 'refletir', 'considerar', 'analisar']
    }
  ]

  // Gestos disponíveis
  const gestures: Gesture[] = [
    {
      id: 'point_right',
      name: 'Apontar Direita',
      description: 'Gesto de apontar para a direita',
      body_parts: ['right_arm', 'right_hand'],
      duration: 2000,
      intensity: 80
    },
    {
      id: 'open_arms',
      name: 'Braços Abertos',
      description: 'Gesto de boas-vindas com braços abertos',
      body_parts: ['both_arms', 'torso'],
      duration: 3000,
      intensity: 70
    },
    {
      id: 'thumbs_up',
      name: 'Polegar para Cima',
      description: 'Gesto de aprovação',
      body_parts: ['right_hand'],
      duration: 1500,
      intensity: 90
    },
    {
      id: 'nod_yes',
      name: 'Acenar Sim',
      description: 'Movimento de cabeça afirmativo',
      body_parts: ['head', 'neck'],
      duration: 1000,
      intensity: 60
    }
  ]

  useEffect(() => {
    loadAvatars()
  }, [])

  const loadAvatars = async () => {
    setIsLoading(true)
    try {
      // Simular carregamento de avatares existentes
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockAvatars: Avatar3D[] = [
        {
          id: 'avatar-1',
          name: 'Dr. Silva - Instrutor Médico',
          description: 'Avatar profissional para treinamentos médicos',
          status: 'ready',
          thumbnail: '/api/placeholder/200/200',
          created_at: '2024-01-15',
          style: 'realistic',
          gender: 'male',
          age_range: 'adult',
          ethnicity: 'latino',
          customizations: {
            hair_color: '#2C1810',
            hair_style: 'professional',
            skin_tone: '#D4A574',
            eye_color: '#8B4513',
            clothing_style: 'medical',
            accessories: ['glasses', 'stethoscope']
          }
        },
        {
          id: 'avatar-2',
          name: 'Ana - Consultora de Segurança',
          description: 'Avatar feminino para treinamentos de segurança',
          status: 'ready',
          thumbnail: '/api/placeholder/200/200',
          created_at: '2024-01-10',
          style: 'professional',
          gender: 'female',
          age_range: 'adult',
          ethnicity: 'caucasian',
          customizations: {
            hair_color: '#8B4513',
            hair_style: 'business',
            skin_tone: '#F5DEB3',
            eye_color: '#4682B4',
            clothing_style: 'business',
            accessories: ['earrings']
          }
        }
      ]
      
      setAvatars(mockAvatars)
    } catch (error) {
      console.error('Erro ao carregar avatares:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAvatar = async () => {
    setIsLoading(true)
    try {
      // Simular geração de avatar com IA
      const newAvatar: Avatar3D = {
        id: `avatar-${Date.now()}`,
        name: avatarConfig.name,
        description: avatarConfig.description,
        status: 'generating',
        thumbnail: '/api/placeholder/200/200',
        created_at: new Date().toISOString().split('T')[0],
        style: avatarConfig.style,
        gender: avatarConfig.gender,
        age_range: avatarConfig.age_range,
        ethnicity: avatarConfig.ethnicity,
        customizations: {
          hair_color: avatarConfig.hair_color,
          hair_style: avatarConfig.hair_style,
          skin_tone: avatarConfig.skin_tone,
          eye_color: avatarConfig.eye_color,
          clothing_style: avatarConfig.clothing_style,
          accessories: avatarConfig.accessories
        }
      }
      
      setAvatars(prev => [...prev, newAvatar])
      
      // Simular processo de geração
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Atualizar status para pronto
      setAvatars(prev => prev.map(avatar => 
        avatar.id === newAvatar.id 
          ? { ...avatar, status: 'ready' }
          : avatar
      ))
      
      setSelectedAvatar({ ...newAvatar, status: 'ready' })
      setActiveTab('animation')
      
    } catch (error) {
      console.error('Erro ao gerar avatar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFacialExpression = async (expressionId: string) => {
    if (!selectedAvatar) return
    
    setIsAnimating(true)
    try {
      // Simular aplicação de expressão facial
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log(`Aplicando expressão ${expressionId} ao avatar ${selectedAvatar.id}`)
    } catch (error) {
      console.error('Erro ao aplicar expressão:', error)
    } finally {
      setIsAnimating(false)
    }
  }

  const applyGesture = async (gestureId: string) => {
    if (!selectedAvatar) return
    
    setIsAnimating(true)
    try {
      // Simular aplicação de gesto
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log(`Aplicando gesto ${gestureId} ao avatar ${selectedAvatar.id}`)
    } catch (error) {
      console.error('Erro ao aplicar gesto:', error)
    } finally {
      setIsAnimating(false)
    }
  }

  const generateLipSync = async () => {
    if (!audioFile || !selectedAvatar) return
    
    setIsGeneratingLipSync(true)
    setLipSyncProgress(0)
    
    try {
      // Simular geração de lip-sync
      for (let i = 0; i <= 100; i += 10) {
        setLipSyncProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      console.log(`Lip-sync gerado para avatar ${selectedAvatar.id}`)
    } catch (error) {
      console.error('Erro ao gerar lip-sync:', error)
    } finally {
      setIsGeneratingLipSync(false)
    }
  }

  const renderVideo = async () => {
    if (!selectedAvatar) return
    
    setIsRendering(true)
    setRenderProgress(0)
    
    try {
      // Simular renderização de vídeo
      for (let i = 0; i <= 100; i += 5) {
        setRenderProgress(i)
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      console.log(`Vídeo renderizado para avatar ${selectedAvatar.id}`)
    } catch (error) {
      console.error('Erro ao renderizar vídeo:', error)
    } finally {
      setIsRendering(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎭 Avatar System Real
          </h1>
          <p className="text-lg text-gray-600">
            Sistema avançado de geração e animação de avatares 3D com IA
          </p>
        </div>

        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="gerador" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Gerador
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="customizacao" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Customização
            </TabsTrigger>
            <TabsTrigger value="personalidade" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Personalidade
            </TabsTrigger>
            <TabsTrigger value="animacao" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Animação
            </TabsTrigger>
            <TabsTrigger value="voz" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Voz
            </TabsTrigger>
            <TabsTrigger value="renderizacao" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Renderização
            </TabsTrigger>
          </TabsList>

          {/* Tab: Gerador de Avatares */}
          <TabsContent value="generator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Gerador de Avatares 3D com IA
                </CardTitle>
                <CardDescription>
                  Crie avatares 3D realistas personalizados usando inteligência artificial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Configurações básicas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Informações Básicas</h3>
                    
                    <div>
                      <Label htmlFor="avatar-name">Nome do Avatar</Label>
                      <Input
                        id="avatar-name"
                        value={avatarConfig.name}
                        onChange={(e) => setAvatarConfig(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Dr. João Silva"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="avatar-description">Descrição</Label>
                      <Textarea
                        id="avatar-description"
                        value={avatarConfig.description}
                        onChange={(e) => setAvatarConfig(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva o propósito e características do avatar"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Estilo</Label>
                        <Select value={avatarConfig.style} onValueChange={(value) => setAvatarConfig(prev => ({ ...prev, style: value as AvatarConfig['style'] }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realistic">Realista</SelectItem>
                            <SelectItem value="cartoon">Cartoon</SelectItem>
                            <SelectItem value="professional">Profissional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Gênero</Label>
                        <Select value={avatarConfig.gender} onValueChange={(value) => setAvatarConfig(prev => ({ ...prev, gender: value as AvatarConfig['gender'] }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Feminino</SelectItem>
                            <SelectItem value="neutral">Neutro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Customização de aparência */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Aparência</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Faixa Etária</Label>
                        <Select value={avatarConfig.age_range} onValueChange={(value) => setAvatarConfig(prev => ({ ...prev, age_range: value as AvatarConfig['age_range'] }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="young">Jovem (18-30)</SelectItem>
                            <SelectItem value="adult">Adulto (30-50)</SelectItem>
                            <SelectItem value="senior">Sênior (50+)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Etnia</Label>
                        <Select value={avatarConfig.ethnicity} onValueChange={(value) => setAvatarConfig(prev => ({ ...prev, ethnicity: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="caucasian">Caucasiano</SelectItem>
                            <SelectItem value="latino">Latino</SelectItem>
                            <SelectItem value="african">Africano</SelectItem>
                            <SelectItem value="asian">Asiático</SelectItem>
                            <SelectItem value="mixed">Misto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cor do Cabelo</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={avatarConfig.hair_color}
                            onChange={(e) => setAvatarConfig(prev => ({ ...prev, hair_color: e.target.value }))}
                            className="w-12 h-10"
                          />
                          <Input
                            value={avatarConfig.hair_color}
                            onChange={(e) => setAvatarConfig(prev => ({ ...prev, hair_color: e.target.value }))}
                            placeholder="#8B4513"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Estilo do Cabelo</Label>
                        <Select value={avatarConfig.hair_style} onValueChange={(value) => setAvatarConfig(prev => ({ ...prev, hair_style: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Curto</SelectItem>
                            <SelectItem value="medium">Médio</SelectItem>
                            <SelectItem value="long">Longo</SelectItem>
                            <SelectItem value="professional">Profissional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Estilo de Roupa</Label>
                      <Select value={avatarConfig.clothing_style} onValueChange={(value) => setAvatarConfig(prev => ({ ...prev, clothing_style: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business">Executivo</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="medical">Médico</SelectItem>
                          <SelectItem value="technical">Técnico</SelectItem>
                          <SelectItem value="educational">Educacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-center">
                  <Button 
                    onClick={generateAvatar}
                    disabled={isLoading || !avatarConfig.name}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Gerando Avatar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar Avatar com IA
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Biblioteca de Avatares */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Biblioteca de Avatares
                </CardTitle>
                <CardDescription>
                  Gerencie seus avatares criados e selecione um para animação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {avatars.map((avatar) => (
                      <Card 
                        key={avatar.id} 
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedAvatar?.id === avatar.id ? 'ring-2 ring-purple-500' : ''
                        }`}
                        onClick={() => setSelectedAvatar(avatar)}
                      >
                        <CardContent className="p-4">
                          <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                            <User className="w-16 h-16 text-gray-400" />
                          </div>
                          
                          <h3 className="font-semibold text-lg mb-2">{avatar.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">{avatar.description}</p>
                          
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant={avatar.status === 'ready' ? 'default' : 'secondary'}>
                              {avatar.status === 'ready' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Pronto
                                </>
                              ) : avatar.status === 'generating' ? (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Gerando
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Erro
                                </>
                              )}
                            </Badge>
                            <span className="text-xs text-gray-500">{avatar.created_at}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAvatar(avatar)
                                setActiveTab('animation')
                              }}
                              disabled={avatar.status !== 'ready'}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Animar
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Customização de Aparência */}
          <TabsContent value="customization" className="space-y-6">
            <AppearanceCustomizer />
          </TabsContent>

          {/* Tab: Presets de Personalidade */}
          <TabsContent value="personality" className="space-y-6">
            <PersonalityPresets />
          </TabsContent>

          {/* Tab: Sistema de Animação */}
          <TabsContent value="animation" className="space-y-6">
            {selectedAvatar ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smile className="w-5 h-5" />
                      Sistema de Animação Facial e Gestos
                    </CardTitle>
                    <CardDescription>
                      Avatar selecionado: {selectedAvatar.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Preview do Avatar */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Preview do Avatar</h3>
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <User className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Preview 3D do Avatar</p>
                            {isAnimating && (
                              <div className="mt-4">
                                <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
                                <p className="text-sm text-purple-600 mt-2">Aplicando animação...</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controles de Animação */}
                      <div className="space-y-6">
                        {/* Expressões Faciais */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Expressões Faciais</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {facialExpressions.map((expression) => (
                              <Button
                                key={expression.id}
                                variant={selectedExpression === expression.id ? 'default' : 'outline'}
                                onClick={() => {
                                  setSelectedExpression(expression.id)
                                  applyFacialExpression(expression.id)
                                }}
                                disabled={isAnimating}
                                className="h-auto p-3 text-left"
                              >
                                <div>
                                  <div className="font-medium">{expression.name}</div>
                                  <div className="text-xs text-gray-500">{expression.description}</div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Gestos */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Gestos e Movimentos</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {gestures.map((gesture) => (
                              <Button
                                key={gesture.id}
                                variant={selectedGesture === gesture.id ? 'default' : 'outline'}
                                onClick={() => {
                                  setSelectedGesture(gesture.id)
                                  applyGesture(gesture.id)
                                }}
                                disabled={isAnimating}
                                className="h-auto p-3 text-left"
                              >
                                <div>
                                  <div className="font-medium">{gesture.name}</div>
                                  <div className="text-xs text-gray-500">{gesture.description}</div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Intensidade da Animação */}
                        <div>
                          <Label>Intensidade da Animação: {animationIntensity}%</Label>
                          <Slider
                            value={[animationIntensity]}
                            onValueChange={(value) => setAnimationIntensity(value[0])}
                            max={100}
                            step={10}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sincronização Labial */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5" />
                      Sincronização Labial (Lip-Sync)
                    </CardTitle>
                    <CardDescription>
                      Sincronize os movimentos labiais do avatar com áudio
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="audio-upload">Upload de Áudio</Label>
                      <Input
                        id="audio-upload"
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                    </div>

                    {audioFile && (
                      <Alert>
                        <Volume2 className="w-4 h-4" />
                        <AlertDescription>
                          Arquivo selecionado: {audioFile.name}
                        </AlertDescription>
                      </Alert>
                    )}

                    {isGeneratingLipSync && (
                      <div>
                        <Label>Progresso da Sincronização: {lipSyncProgress}%</Label>
                        <Progress value={lipSyncProgress} className="mt-2" />
                      </div>
                    )}

                    <Button
                      onClick={generateLipSync}
                      disabled={!audioFile || isGeneratingLipSync}
                      className="w-full"
                    >
                      {isGeneratingLipSync ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Gerando Lip-Sync...
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Gerar Sincronização Labial
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum Avatar Selecionado</h3>
                  <p className="text-gray-600 mb-4">
                    Selecione um avatar da biblioteca para começar a animação
                  </p>
                  <Button onClick={() => setActiveTab('library')}>
                    <User className="w-4 h-4 mr-2" />
                    Ir para Biblioteca
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Sistema de Voz */}
          <TabsContent value="voice" className="space-y-6">
            <VoiceCloningIntegration
              selectedVoiceId={selectedAvatar?.id}
              avatarId={selectedAvatar?.id}
              onVoiceSelected={(voiceId, voiceName) => {
                console.log(`Voz selecionada: ${voiceName} (${voiceId}) para avatar ${selectedAvatar?.id}`)
              }}
            />
          </TabsContent>

          {/* Tab: Renderização */}
          <TabsContent value="renderizacao" className="space-y-6">
            <RealTimeRenderer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}