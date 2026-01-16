'use client'

/**
 * Professional PPTX Studio - Complete Workflow V4
 * Integration of Upload + Scene Editor + Timeline + TTS + Export with real data loading
 * Now with drag-and-drop scene editing, media library, and auto-fit canvas
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Upload,
  Film,
  Download,
  Settings,
  Zap,
  Loader2,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Logger } from '@lib/logger'

const logger = new Logger('PPTXStudio')

// Import components
import PPTXUploadComponent, { ProcessingResult } from './PPTXUploadComponent'
import { SceneCanvasEditor, SceneData, SceneElement } from './scene-canvas-editor'
import ProfessionalTimelineEditor from '../timeline/professional-timeline-editor'
import { StudioLayout } from './studio/studio-layout'
import { StudioSidebar } from './studio/studio-sidebar'
import { MediaLibraryPanel } from './media-library-panel'
import { SlidesPanel } from './slides-panel'
import { ElevenLabsVoiceSelector } from '../tts/elevenlabs-voice-selector'
import { ScrollArea } from '@components/ui/scroll-area'
import { PropertiesPanel, FlexibleElement } from '../editor/properties-panel'

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

interface ProfessionalPPTXStudioProps {
  projectId?: string;
}

export function ProfessionalPPTXStudio({ projectId: propProjectId }: ProfessionalPPTXStudioProps) {
  const searchParams = useSearchParams()
  const searchProjectId = searchParams?.get('projectId')

  // Use prop if available (Master Route), otherwise fallback to search params (Legacy/Direct)
  const projectId = propProjectId || searchProjectId

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

  // Selection State (Phase 4)
  const [selectedElement, setSelectedElement] = useState<FlexibleElement | null>(null)

  // Scene Management State (Phase 5 - Drag & Drop)
  const [scenes, setScenes] = useState<SceneData[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)

  // Get current scene
  const currentScene = scenes.find(s => s.id === selectedSceneId) || null

  const handleSelectionChange = (element: FlexibleElement | null) => {
    logger.info('Selection changed', { elementId: element?.id })
    setSelectedElement(element)
  }

  const handleElementUpdate = (elementId: string, updates: Partial<FlexibleElement>) => {
    logger.info('Element updated', { elementId, updates })
    if (selectedElement && selectedElement.id === elementId) {
      setSelectedElement({ ...selectedElement, ...updates })
    }
  }

  // Scene management handlers
  const handleSceneUpdate = useCallback((updatedScene: SceneData) => {
    setScenes(prev => prev.map(s => s.id === updatedScene.id ? updatedScene : s))
    addLog(`Cena "${updatedScene.name}" atualizada`)
  }, [])

  const handleSceneSelect = useCallback((sceneId: string) => {
    setSelectedSceneId(sceneId)
    setSelectedElement(null) // Clear element selection when changing scenes
    addLog(`Cena selecionada: ${sceneId}`)
  }, [])

  const handleSceneAdd = useCallback(() => {
    const newScene: SceneData = {
      id: `scene-${Date.now()}`,
      name: `Cena ${scenes.length + 1}`,
      duration: 5,
      backgroundColor: '#1f2937',
      elements: []
    }
    setScenes(prev => [...prev, newScene])
    setSelectedSceneId(newScene.id)
    toast.success('Nova cena adicionada!')
    addLog(`Nova cena criada: ${newScene.name}`)
  }, [scenes.length])

  const handleSceneDelete = useCallback((sceneId: string) => {
    setScenes(prev => {
      const newScenes = prev.filter(s => s.id !== sceneId)
      // Select another scene if deleting the selected one
      if (selectedSceneId === sceneId && newScenes.length > 0) {
        setSelectedSceneId(newScenes[0].id)
      } else if (newScenes.length === 0) {
        setSelectedSceneId(null)
      }
      return newScenes
    })
    toast.success('Cena removida!')
  }, [selectedSceneId])

  const handleSceneDuplicate = useCallback((sceneId: string) => {
    const sceneToDuplicate = scenes.find(s => s.id === sceneId)
    if (!sceneToDuplicate) return

    const duplicatedScene: SceneData = {
      ...sceneToDuplicate,
      id: `scene-${Date.now()}`,
      name: `${sceneToDuplicate.name} (copia)`,
      elements: sceneToDuplicate.elements.map(el => ({
        ...el,
        id: `${el.id}-copy-${Date.now()}`
      }))
    }

    const originalIndex = scenes.findIndex(s => s.id === sceneId)
    setScenes(prev => {
      const newScenes = [...prev]
      newScenes.splice(originalIndex + 1, 0, duplicatedScene)
      return newScenes
    })
    setSelectedSceneId(duplicatedScene.id)
    toast.success('Cena duplicada!')
  }, [scenes])

  const handleScenesReorder = useCallback((reorderedScenes: SceneData[]) => {
    setScenes(reorderedScenes)
  }, [])

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
        initialTab = 'slides'
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

      // Convert project slides to scenes for the new editor
      if (project.slides && Array.isArray(project.slides) && project.slides.length > 0) {
        const convertedScenes: SceneData[] = project.slides.map((slide: any, index: number) => ({
          id: slide.id || `scene-${index}`,
          name: slide.title || `Cena ${index + 1}`,
          duration: slide.duration || 5,
          backgroundColor: slide.background_color || '#1f2937',
          backgroundImage: slide.background_image,
          thumbnail: slide.thumbnail,
          elements: (slide.elements || []).map((el: any) => ({
            id: el.id || `el-${Date.now()}-${Math.random()}`,
            type: el.type || 'shape',
            name: el.name || 'Elemento',
            x: el.x || 0,
            y: el.y || 0,
            width: el.width || 100,
            height: el.height || 100,
            rotation: el.rotation || 0,
            opacity: el.opacity || 1,
            visible: el.visible !== false,
            locked: el.locked || false,
            zIndex: el.zIndex || 0,
            sourceUrl: el.sourceUrl,
            content: el.content,
            style: el.style || {}
          }))
        }))
        setScenes(convertedScenes)
        if (convertedScenes.length > 0) {
          setSelectedSceneId(convertedScenes[0].id)
        }
        addLog(`${convertedScenes.length} cenas carregadas do projeto`)
      } else if (project.totalSlides > 0) {
        // Create empty scenes based on total slides count
        const emptyScenes: SceneData[] = Array.from({ length: project.totalSlides }, (_, i) => ({
          id: `scene-${i}`,
          name: `Cena ${i + 1}`,
          duration: Math.ceil(project.duration / project.totalSlides) || 5,
          backgroundColor: '#1f2937',
          elements: []
        }))
        setScenes(emptyScenes)
        if (emptyScenes.length > 0) {
          setSelectedSceneId(emptyScenes[0].id)
        }
        addLog(`${emptyScenes.length} cenas vazias criadas`)
      }

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

  // Render sidebar content based on active tab
  const renderSidebarContent = () => {
    switch (activeTab) {
      case 'slides':
        return (
          <SlidesPanel
            slides={scenes}
            selectedSlideId={selectedSceneId || undefined}
            onSlideSelect={handleSceneSelect}
            onSlideAdd={handleSceneAdd}
            onSlideDelete={handleSceneDelete}
            onSlideDuplicate={handleSceneDuplicate}
            onSlidesReorder={handleScenesReorder}
          />
        )
      case 'media':
        return <MediaLibraryPanel />
      case 'tts':
      case 'ai':
        return (
          <div className="h-full flex flex-col p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Configuracao de Voz (TTS)</h3>
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-6">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="text-xs font-medium text-gray-400 mb-2">Resumo do Projeto</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Cenas</span>
                      <span className="text-white">{scenes.length || projectState.project?.totalSlides || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Duracao</span>
                      <span className="text-white">{projectState.project?.duration || scenes.reduce((acc, s) => acc + s.duration, 0)}s</span>
                    </div>
                  </div>
                </div>

                <ElevenLabsVoiceSelector />

                <Button
                  onClick={handleGenerateAllNarrations}
                  disabled={isGeneratingAll}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-500 hover:to-blue-500"
                >
                  {isGeneratingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Gerar Narracao (All)
                    </>
                  )}
                </Button>
              </div>
            </ScrollArea>
          </div>
        )
      case 'export':
        return (
          <div className="h-full flex flex-col p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Exportar Video</h3>
            <div className="flex-1 flex flex-col gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <Film className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-sm font-medium text-white">Full HD 1080p</div>
                <div className="text-xs text-gray-500">MP4 H.264</div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting || scenes.length === 0}
                size="lg"
                className="w-full mt-auto bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Renderizando...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Exportar Video Final
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <StudioLayout
      sidebar={
        <StudioSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          disabled={!projectState.data.uploadResult && scenes.length === 0}
        />
      }
      bottomPanel={
        projectState.data.uploadResult || scenes.length > 0 ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#151921]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Timeline</span>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs text-gray-400">
                  {scenes.reduce((acc, s) => acc + s.duration, 0) || projectState.project?.duration || 0}s
                </span>
                <Badge className="text-[10px] h-4 bg-blue-600/20 text-blue-400 border-0 ml-2">
                  {scenes.length} cenas
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-white/10">
                  <Settings className="w-3 h-3 text-gray-400" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <ProfessionalTimelineEditor
                onSelectionChange={handleSelectionChange}
                selectedElement={selectedElement}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Timeline indisponivel. Adicione cenas ou faca upload de um PPTX.
          </div>
        )
      }
      rightPanel={
        // Properties Panel - Show when element is selected, or show sidebar content
        selectedElement ? (
          <PropertiesPanel
            selectedElement={selectedElement}
            onUpdateElement={handleElementUpdate}
            onDeleteElement={(id) => {
              logger.info('Delete element', { id })
              setSelectedElement(null)
            }}
            onDuplicateElement={(id) => logger.info('Duplicate element', { id })}
          />
        ) : renderSidebarContent()
      }
    >
      {/* Main Canvas Area Content */}
      {projectState.loading ? (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 relative z-10" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-2"
          >
            <h3 className="text-lg font-medium text-white">Processando Projeto</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Estamos preparando seus slides e gerando a narração com IA...
            </p>
          </motion.div>
        </div>
      ) : activeTab === 'upload' ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0f1115]">
          <div className="max-w-2xl w-full bg-[#151921] rounded-2xl border border-white/5 p-12 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3 text-center tracking-tight">Novo Projeto</h1>
            <p className="text-gray-400 text-center mb-10 max-w-md">
              Importe sua apresentação PowerPoint (.pptx) para transformar automaticamente em vídeo com narração IA.
            </p>
            <div className="w-full">
              <PPTXUploadComponent
                onProcessComplete={handleUploadComplete}
                disableAutoRedirect
              />
            </div>
            <div className="mt-8 text-xs text-gray-600">
              Suporta .pptx até 50MB • Mantém formatação e imagens
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
          {/* Top Bar inside Canvas */}
          <div className="h-12 border-b border-white/5 bg-[#151921] flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-white">
                {currentScene?.name || projectState.project?.name || 'Sem Titulo'}
              </h2>
              {projectState.project?.status && (
                <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-gray-400">
                  {projectState.project.status}
                </Badge>
              )}
              {scenes.length > 0 && (
                <Badge className="text-[10px] h-5 bg-blue-600/20 text-blue-400 border-0">
                  Cena {scenes.findIndex(s => s.id === selectedSceneId) + 1} de {scenes.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Auto-saved</span>
            </div>
          </div>

          {/* Scene Canvas Editor */}
          <div className="flex-1 bg-[#0f1115] relative overflow-hidden">
            {currentScene ? (
              <SceneCanvasEditor
                width={1280}
                height={720}
                sceneData={currentScene}
                onSceneUpdate={handleSceneUpdate}
                onSelectionChange={handleSelectionChange}
                selectedElement={selectedElement}
              />
            ) : scenes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Film className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-sm">Nenhuma cena disponivel</p>
                <p className="text-xs text-gray-600 max-w-xs text-center">
                  Faca upload de um PPTX ou adicione uma nova cena para comecar a editar
                </p>
                <Button
                  onClick={() => setActiveTab('upload')}
                  variant="outline"
                  className="mt-2 mr-2 border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer Upload PPTX
                </Button>
                <Button
                  onClick={handleSceneAdd}
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Criar Nova Cena
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>Selecione uma cena na lista lateral</p>
              </div>
            )}
          </div>
        </div>
      )}
    </StudioLayout>
  )
}
