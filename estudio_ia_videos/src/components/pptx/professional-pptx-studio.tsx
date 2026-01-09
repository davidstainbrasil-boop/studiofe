'use client'

/**
 * Professional PPTX Studio - Complete Workflow V3
 * Integration of Upload + Canvas + Timeline + TTS + Export with real data loading
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { Badge } from '@components/ui/badge'
import { Separator } from '@components/ui/separator'
import { toast } from 'react-hot-toast'
import { 
  Upload, 
  Palette, 
  Film, 
  Volume2, 
  Download,
  Settings,
  Play,
  FileText,
  Zap,
  Users,
  ArrowRight,
  Loader2,
  Database,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Logger } from '@lib/logger'

const logger = new Logger('PPTXStudio')

// Import components
import PPTXUploadComponent, { ProcessingResult } from './PPTXUploadComponent'
import { FabricCanvasEditor } from './fabric-canvas-editor'
import ProfessionalTimelineEditor from '../timeline/professional-timeline-editor'
import { ElevenLabsVoiceSelector } from '../tts/elevenlabs-voice-selector'

interface ProjectData {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
  type?: string
  originalFileName?: string
  pptxUrl?: string
  slidesData?: Record<string, unknown> // JSON completo dos slides processados
  totalSlides: number
  slides?: Record<string, unknown>[] // Slides individuais do banco
  videoUrl?: string
  thumbnailUrl?: string
  duration: number
  audioUrl?: string
  ttsProvider?: string
  voiceId?: string
  settings?: Record<string, unknown>
  views: number
  downloads: number
  processingLog?: Record<string, unknown>
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

interface ProjectState {
  step: 'upload' | 'edit' | 'timeline' | 'tts' | 'export'
  loading: boolean
  data: {
    uploadResult?: Record<string, unknown>
    canvasData?: Record<string, unknown>
    timelineData?: Record<string, unknown>
    ttsData?: Record<string, unknown>
  }
  project?: ProjectData
}

export function ProfessionalPPTXStudio() {
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('projectId')
  
  const [projectState, setProjectState] = useState<ProjectState>({
    step: 'upload',
    loading: false,
    data: {}
  })
  
  const [activeTab, setActiveTab] = useState('upload')
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  
  const addLog = (message: string) => {
    logger.info(message)
    setDebugLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Load project data if projectId is provided
  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId)
    } else {
      addLog('Nenhum projectId fornecido - iniciando com upload')
    }
  }, [projectId])

  // Polling for status updates
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (projectState.project?.status === 'PROCESSING' || isExporting || exportJobId) {
      interval = setInterval(() => {
        if (projectState.project?.id) {
          loadProjectData(projectState.project.id)
        }
      }, 5000) // Poll every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [projectState.project?.status, isExporting, exportJobId])

  const loadProjectData = async (id: string) => {
    try {
      addLog(`📋 Carregando dados do projeto: ${id}`)
      setProjectState(prev => ({ ...prev, loading: true }))
      
      const response = await fetch(`/api/projects/${id}`)
      
      if (!response.ok) {
        throw new Error('Projeto não encontrado')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar projeto')
      }
      
      const project = result.data
      addLog(`✅ Projeto carregado: ${project.name} (${project.totalSlides} slides)`)
      
      // Determine which step to start at based on project status
      let initialStep: ProjectState['step'] = 'upload'
      let initialTab = 'upload'
      
      if (project.status === 'COMPLETED' && project.slidesData) {
        initialStep = 'edit'
        initialTab = 'edit'
        addLog('📝 Projeto completo - iniciando no editor')
      } else if (project.status === 'PROCESSING') {
        initialStep = 'upload' 
        initialTab = 'upload'
        addLog('⏳ Projeto em processamento')
      } else if (project.status === 'ERROR') {
        addLog(`❌ Projeto com erro: ${project.errorMessage}`)
      }
      
      setProjectState({
        step: initialStep,
        loading: false,
        data: {
          uploadResult: project.slidesData ? {
            slides: project.totalSlides,
            duration: project.duration,
            assets: ((project.slidesData['assets'] as Record<string, unknown>)?.images as unknown[])?.length || 0,
            timeline: project.slidesData['timeline'],
            s3Key: project.pptxUrl,
            fileName: project.originalFileName,
            projectId: project.id
          } : undefined
        },
        project
      })
      
      setActiveTab(initialTab)
      
      if (project.status === 'COMPLETED') {
        toast.success('✅ Projeto carregado - dados disponíveis para edição!')
      }
      
    } catch (error) {
      logger.error('Error loading project', error instanceof Error ? error : undefined)
      addLog(`❌ Erro ao carregar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      
      setProjectState(prev => ({ ...prev, loading: false }))
      toast.error('❌ Erro ao carregar projeto')
    }
  }
  
  // Handle upload completion
  const handleUploadComplete = (uploadResult: ProcessingResult) => {
    addLog(`✅ Upload concluído: Projeto ${uploadResult.projectId}`)
    
    setProjectState(prev => ({
      ...prev,
      step: 'edit',
      data: { ...prev.data, uploadResult: uploadResult as unknown as Record<string, unknown> }
    }))
    
    setActiveTab('edit')
    toast.success('✅ Upload concluído! Agora você pode editar o canvas.')
    
    // Reload project data to get fresh database info
    if (uploadResult.projectId) {
      const projectIdToLoad = uploadResult.projectId
      setTimeout(() => loadProjectData(projectIdToLoad), 1000)
    }
  }
  
  // Handle canvas updates
  const handleCanvasUpdate = (canvasData: Record<string, unknown>) => {
    addLog('🎨 Canvas atualizado')
    setProjectState(prev => ({
      ...prev,
      data: { ...prev.data, canvasData }
    }))
  }
  
  // Handle timeline updates
  const handleTimelineUpdate = (timelineData: Record<string, unknown>) => {
    addLog('🎬 Timeline atualizada')
    setProjectState(prev => ({
      ...prev,
      data: { ...prev.data, timelineData }
    }))
  }
  
  // Handle TTS updates
  const handleTTSUpdate = (ttsData: Record<string, unknown>) => {
    addLog('🎤 TTS configurado')
    setProjectState(prev => ({
      ...prev,
      data: { ...prev.data, ttsData }
    }))
  }

  const handleGenerateAllNarrations = async () => {
    if (!projectState.project?.id) return

    try {
      setIsGeneratingAll(true)
      addLog('🎙️ Iniciando geração de narração em massa...')
      toast.loading('Gerando narrações para todos os slides...', { id: 'batch-tts' })

      const response = await fetch('/api/v1/pptx/auto-narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectState.project.id,
          options: {
            provider: 'elevenlabs',
            // TODO: Pass selected voice from selector if possible
            voice: '21m00Tcm4TlvDq8ikWAM' // Default Rachel
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro na geração em massa')
      }

      addLog(`✅ Narração concluída: ${result.narrations.length} slides processados`)
      toast.success('Narrações geradas com sucesso!', { id: 'batch-tts' })
      
      // Reload project to get new audio URLs
      loadProjectData(projectState.project.id)

    } catch (error) {
      logger.error('Error generating narrations', error instanceof Error ? error : undefined)
      addLog(`❌ Erro na narração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      toast.error('Erro ao gerar narrações', { id: 'batch-tts' })
    } finally {
      setIsGeneratingAll(false)
    }
  }

  const handleExport = async () => {
    if (!projectState.project?.id) return

    try {
      setIsExporting(true)
      addLog('🎬 Iniciando exportação do vídeo...')
      toast.loading('Iniciando renderização do vídeo...', { id: 'export-video' })

      const response = await fetch('/api/v1/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectState.project.id,
          settings: {
            resolution: '1080p',
            quality: 'high'
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao iniciar exportação')
      }

      setExportJobId(result.jobId)
      addLog(`✅ Job de renderização criado: ${result.jobId}`)
      toast.success('Renderização iniciada! O vídeo estará disponível em breve.', { id: 'export-video' })
      
      // TODO: Implement polling for job status

    } catch (error) {
      logger.error('Error exporting video', error instanceof Error ? error : undefined)
      addLog(`❌ Erro na exportação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      toast.error('Erro ao iniciar exportação', { id: 'export-video' })
    } finally {
      setIsExporting(false)
    }
  }

  if (projectState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <div>
                <div className="font-medium">Carregando projeto...</div>
                <div className="text-sm text-gray-500">ID: {projectId}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Estúdio PPTX Professional
              </h1>
              <p className="text-gray-600">
                {projectState.project?.name || 'Novo Projeto'} 
                {projectState.project && (
                  <Badge className="ml-2" variant={
                    projectState.project.status === 'COMPLETED' ? 'default' :
                    projectState.project.status === 'PROCESSING' ? 'secondary' :
                    projectState.project.status === 'ERROR' ? 'destructive' : 'outline'
                  }>
                    {projectState.project.status}
                  </Badge>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {projectState.project && (
                <>
                  <div className="text-right text-sm text-gray-500">
                    <div>{projectState.project.totalSlides} slides</div>
                    <div>{projectState.project.duration}s</div>
                  </div>
                  
                  {projectState.project.status === 'COMPLETED' && (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  )}
                  {projectState.project.status === 'PROCESSING' && (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  )}
                  {projectState.project.status === 'ERROR' && (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2" disabled={!projectState.data.uploadResult}>
              <Palette className="h-4 w-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2" disabled={!projectState.data.uploadResult}>
              <Film className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-2" disabled={!projectState.data.uploadResult}>
              <Volume2 className="h-4 w-4" />
              TTS/Áudio
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2" disabled={!projectState.data.uploadResult}>
              <Download className="h-4 w-4" />
              Exportar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <PPTXUploadComponent 
              onProcessComplete={handleUploadComplete}
              disableAutoRedirect
            />
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Canvas Editor
                  {projectState.project?.slidesData && (
                    <Badge className="ml-2">Dados Reais Carregados</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectState.project?.slidesData ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <h3 className="font-medium text-blue-800 mb-2">📊 Dados Carregados do Banco</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <strong>Slides:</strong> {projectState.project.totalSlides}
                        </div>
                        <div>
                          <strong>Duração:</strong> {projectState.project.duration}s
                        </div>
                        <div>
                          <strong>Status:</strong> {projectState.project.status}
                        </div>
                      </div>
                      {!!projectState.project.slidesData?.['slides'] && (
                        <details className="mt-3">
                          <summary className="cursor-pointer font-medium text-blue-700">
                            Ver dados dos slides (JSON)
                          </summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify((projectState.project.slidesData['slides'] as unknown[]).slice(0, 2), null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <FabricCanvasEditor />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhum dado carregado. Faça o upload primeiro.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Timeline Editor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectState.project?.slidesData?.['timeline'] ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                      <h3 className="font-medium text-green-800 mb-2">🎬 Timeline Carregada</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Cenas:</strong> {(projectState.project.slidesData['timeline'] as { scenes: unknown[] })?.scenes?.length || 0}
                        </div>
                        <div>
                          <strong>Duração Total:</strong> {Math.round((projectState.project.slidesData['timeline'] as { totalDuration: number })?.totalDuration || 0)}s
                        </div>
                      </div>
                    </div>
                    <ProfessionalTimelineEditor />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Film className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Timeline não disponível. Processe um PPTX primeiro.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Text-to-Speech
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectState.project?.slides && projectState.project.slides.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded border border-purple-200">
                      <h3 className="font-medium text-purple-800 mb-2">🎤 Slides para TTS</h3>
                      <div className="text-sm">
                        <strong>Slides disponíveis:</strong> {projectState.project.slides.length}
                      </div>
                      <div className="mt-2 space-y-1">
                        {projectState.project.slides.slice(0, 3).map((slide: Record<string, unknown>, index: number) => (
                          <div key={index} className="text-xs bg-white p-2 rounded">
                            <strong>Slide {String(slide.slideNumber)}:</strong> {String(slide.title)}
                          </div>
                        ))}
                        {projectState.project.slides.length > 3 && (
                          <div className="text-xs text-purple-600">
                            ...e mais {projectState.project.slides.length - 3} slides
                          </div>
                        )}
                      </div>
                    </div>
                    <ElevenLabsVoiceSelector />
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-end">
                        <Button 
                            onClick={handleGenerateAllNarrations}
                            disabled={isGeneratingAll}
                            className="bg-gradient-to-r from-purple-600 to-blue-600"
                        >
                            {isGeneratingAll ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando Narrações...
                                </>
                            ) : (
                                <>
                                    <Zap className="mr-2 h-4 w-4" />
                                    Gerar Narração para Todos os Slides
                                </>
                            )}
                        </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Volume2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Nenhum slide disponível para TTS. Processe um PPTX primeiro.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exportar Vídeo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  {projectState.project?.videoUrl ? (
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                          <video 
                            src={projectState.project.videoUrl} 
                            controls 
                            className="w-full h-full"
                            poster={projectState.project.thumbnailUrl}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-center gap-4">
                        <Button 
                          variant="outline"
                          onClick={() => window.open(projectState.project!.videoUrl, '_blank')}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Abrir em Nova Aba
                        </Button>
                        <Button 
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = projectState.project!.videoUrl!;
                            a.download = `${projectState.project!.name || 'video'}.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar MP4
                        </Button>
                      </div>

                      <div className="text-sm text-gray-500">
                        Renderizado em: {new Date(projectState.project.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  ) : exportJobId ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                      </div>
                      <h3 className="text-xl font-medium text-gray-900">
                        Renderizando seu vídeo...
                      </h3>
                      <p className="text-gray-500">
                        Job ID: {exportJobId}
                      </p>
                      <p className="text-sm text-gray-400">
                        Isso pode levar alguns minutos. Você pode fechar esta janela e voltar mais tarde.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Film className="h-16 w-16 text-blue-500 mx-auto mb-6" />
                      <h3 className="text-xl font-medium text-gray-900 mb-3">
                        Pronto para Renderizar
                      </h3>
                      <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Seu projeto tem {projectState.project?.totalSlides} slides e duração estimada de {projectState.project?.duration}s.
                        Clique abaixo para iniciar a renderização final em 1080p.
                      </p>
                      <Button 
                        onClick={handleExport} 
                        disabled={isExporting}
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Iniciando Render...
                          </>
                        ) : (
                          <>
                            <Download className="h-5 w-5 mr-2" />
                            Renderizar Vídeo Final (MP4)
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Debug Panel */}
        {debugLogs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Debug Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs space-y-1 max-h-32 overflow-y-auto">
                {debugLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
