
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Slider } from '@components/ui/slider'
import { Textarea } from '@components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import { 
  User,
  Mic,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Settings,
  Sparkles,
  Wand2,
  Users,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Avatar {
  id: string
  name: string
  type: 'executivo' | 'engenheiro' | 'professor' | 'operador'
  gender: 'male' | 'female'
  preview: string
  description: string
}

interface Voice {
  id: string
  name: string
  gender: 'male' | 'female'
  language: 'pt-BR'
  provider: 'elevenlabs' | 'azure' | 'google'
  premium: boolean
}

// TTS generation config type
interface TTSConfig {
  avatarId: string;
  voiceId: string;
  text: string;
  speed: number;
  pitch: number;
  volume: number;
}

interface AvatarTTSPrototypeProps {
  onGenerate?: (config: TTSConfig) => void
}

export function AvatarTTSPrototype({ onGenerate }: AvatarTTSPrototypeProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>('')
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [text, setText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null)
  const [speed, setSpeed] = useState([1.0])
  const [pitch, setPitch] = useState([0])
  const [volume, setVolume] = useState([80])

  const mockAvatars: Avatar[] = [
    {
      id: 'executivo-1',
      name: 'Carlos Silva',
      type: 'executivo',
      gender: 'male',
      preview: '👨‍💼',
      description: 'Executivo sênior, ideal para apresentações corporativas'
    },
    {
      id: 'engenheira-1',
      name: 'Ana Santos',
      type: 'engenheiro',
      gender: 'female',
      preview: '👩‍🔬',
      description: 'Engenheira especialista em segurança do trabalho'
    },
    {
      id: 'professor-1',
      name: 'Roberto Costa',
      type: 'professor',
      gender: 'male',
      preview: '👨‍🏫',
      description: 'Professor especializado em treinamentos técnicos'
    },
    {
      id: 'operadora-1',
      name: 'Maria Oliveira',
      type: 'operador',
      gender: 'female',
      preview: '👩‍🏭',
      description: 'Operadora experiente, focada em procedimentos práticos'
    }
  ]

  const mockVoices: Voice[] = [
    {
      id: 'elevenlabs-clara',
      name: 'Clara (Premium)',
      gender: 'female',
      language: 'pt-BR',
      provider: 'elevenlabs',
      premium: true
    },
    {
      id: 'elevenlabs-ricardo',
      name: 'Ricardo (Premium)',
      gender: 'male',
      language: 'pt-BR',
      provider: 'elevenlabs',
      premium: true
    },
    {
      id: 'azure-ana',
      name: 'Ana (Azure)',
      gender: 'female',
      language: 'pt-BR',
      provider: 'azure',
      premium: false
    },
    {
      id: 'google-marcos',
      name: 'Marcos (Google)',
      gender: 'male',
      language: 'pt-BR',
      provider: 'google',
      premium: false
    }
  ]

  const handleGenerate = async () => {
    if (!selectedAvatar || !selectedVoice || !text.trim()) {
      toast.error('Selecione avatar, voz e texto para gerar')
      return
    }

    setIsGenerating(true)
    toast.success('Iniciando geração de avatar com TTS...')

    // Simular geração
    setTimeout(() => {
      setIsGenerating(false)
      setGeneratedAudio('mock-audio-url')
      toast.success('Avatar e narração gerados com sucesso!')
      
      const config: TTSConfig = {
        avatarId: selectedAvatar,
        voiceId: selectedVoice,
        text: text,
        speed: speed[0],
        pitch: pitch[0],
        volume: volume[0]
      }
      
      onGenerate?.(config)
    }, 4000)
  }

  const handlePlay = () => {
    if (!generatedAudio) {
      toast.error('Gere o áudio primeiro')
      return
    }
    
    setIsPlaying(!isPlaying)
    toast.success(isPlaying ? 'Pausando reprodução' : 'Reproduzindo áudio gerado')
  }

  const handleDownload = () => {
    if (!generatedAudio) {
      toast.error('Nenhum áudio para download')
      return
    }
    
    toast.success('Download iniciado (simulação)')
  }

  const sampleTexts = [
    'Bem-vindos ao treinamento de segurança em máquinas e equipamentos conforme a NR-12.',
    'É essencial utilizar os equipamentos de proteção individual em todas as atividades.',
    'Antes de iniciar qualquer trabalho, verifique se todos os sistemas de segurança estão funcionando.',
    'Lembre-se: a prevenção de acidentes é responsabilidade de todos nós.'
  ]

  const insertSampleText = (sample: string) => {
    setText(sample)
    toast.success('Texto de exemplo inserido!')
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Users className="h-8 w-8 text-purple-600" />
          Avatar 3D + TTS - Protótipo Interativo
        </h2>
        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
          Sistema Completo de Geração
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-6">
          {/* Avatar Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Escolha o Avatar 3D
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {mockAvatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedAvatar === avatar.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">{avatar.preview}</div>
                      <h4 className="font-medium text-sm">{avatar.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{avatar.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {avatar.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Voice Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-green-600" />
                Configurar Voz TTS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Selecionar Voz:</label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma voz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{voice.name}</span>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant="outline" className="text-xs">
                              {voice.provider}
                            </Badge>
                            {voice.premium && (
                              <Badge variant="default" className="text-xs bg-yellow-500">
                                Premium
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium">Velocidade: {speed[0]}x</label>
                  <Slider
                    value={speed}
                    onValueChange={setSpeed}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tom: {pitch[0] > 0 ? '+' : ''}{pitch[0]}</label>
                  <Slider
                    value={pitch}
                    onValueChange={setPitch}
                    min={-20}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Volume: {volume[0]}%</label>
                  <Slider
                    value={volume}
                    onValueChange={setVolume}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Text and Preview */}
        <div className="space-y-6">
          {/* Text Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-orange-600" />
                Texto para Narração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite o texto que será narrado pelo avatar..."
                className="min-h-32"
              />
              
              <div className="text-sm text-gray-600">
                Caracteres: {text.length} | Tempo estimado: ~{Math.ceil(text.length / 150)}min
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Textos de Exemplo:</label>
                <div className="grid grid-cols-1 gap-2">
                  {sampleTexts.map((sample, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left text-xs p-2 h-auto"
                      onClick={() => insertSampleText(sample)}
                    >
                      {sample.substring(0, 60)}...
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Preview do Avatar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                {selectedAvatar ? (
                  <div className="text-center">
                    <div className="text-8xl mb-4">
                      {mockAvatars.find(a => a.id === selectedAvatar)?.preview || '👤'}
                    </div>
                    <h3 className="text-xl font-bold">
                      {mockAvatars.find(a => a.id === selectedAvatar)?.name}
                    </h3>
                    <p className="text-sm opacity-90 mt-2">
                      {selectedVoice ? mockVoices.find(v => v.id === selectedVoice)?.name : 'Voz não selecionada'}
                    </p>
                    
                    {isGenerating && (
                      <div className="mt-4">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Gerando avatar e narração...</p>
                      </div>
                    )}
                    
                    {generatedAudio && !isGenerating && (
                      <div className="mt-4">
                        <Badge className="bg-green-600 mb-3">Geração Concluída</Badge>
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePlay}
                            className="text-white border-white hover:bg-white/20"
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownload}
                            className="text-white border-white hover:bg-white/20"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg opacity-75">Selecione um avatar para começar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generation Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">Configuração Atual</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Avatar: {selectedAvatar ? mockAvatars.find(a => a.id === selectedAvatar)?.name : 'Não selecionado'}</span>
                <span>Voz: {selectedVoice ? mockVoices.find(v => v.id === selectedVoice)?.name : 'Não selecionada'}</span>
                <span>Texto: {text.length} caracteres</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAvatar('')
                  setSelectedVoice('')
                  setText('')
                  setGeneratedAudio(null)
                  toast.success('Configurações resetadas!')
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedAvatar || !selectedVoice || !text.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Gerando...' : 'Gerar Avatar + TTS'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
