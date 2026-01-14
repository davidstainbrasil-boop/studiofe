'use client'

/**
 * Professional PPTX Studio - Complete Workflow V3
 * Integration of Upload + Canvas + Timeline + TTS + Export with real data loading
 */

import React, { useState, useEffect } from 'react'
// import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card' // Removed
import { Button } from '@components/ui/button'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs' // Removed
import { Badge } from '@components/ui/badge'
// import { Separator } from '@components/ui/separator' // Removed
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  Upload,
  Palette,
  Film,
  Volume2,
  Download,
  Settings,
  Play,
  // FileText,
  Zap,
  // Users,
  // ArrowRight,
  Loader2,
  // Database,
  // CheckCircle,
  // AlertCircle
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Logger } from '@lib/logger'

const logger = new Logger('PPTXStudio')

// Import components
import PPTXUploadComponent, { ProcessingResult } from './PPTXUploadComponent'
import { FabricCanvasEditor } from './fabric-canvas-editor'
import ProfessionalTimelineEditor from '../timeline/professional-timeline-editor'
import { StudioLayout } from './studio/studio-layout'
import { StudioSidebar } from './studio/studio-sidebar'
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

  return (
    <StudioLayout
      sidebar={
        <StudioSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          disabled={!projectState.data.uploadResult}
        />
      }
      bottomPanel={
        projectState.data.uploadResult ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#151921]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Timeline</span>
                <span className="text-xs text-gray-600">|</span>
                <span className="text-xs text-gray-400">{projectState.project?.duration}s</span>
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
            Timeline indisponível. Faça upload de um PPTX primeiro.
          </div>
        )
      }
      rightPanel={
        // Highlight: Integration of Properties Panel (Phase 4)
        selectedElement ? (
          <PropertiesPanel
            selectedElement={selectedElement}
            onUpdateElement={handleElementUpdate}
            onDeleteElement={(id) => logger.info('Delete element', { id })}
            onDuplicateElement={(id) => logger.info('Duplicate element', { id })}
          />
        ) : activeTab === 'tts' && projectState.data.uploadResult ? (
          <div className="h-full flex flex-col p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Configuração de Voz (TTS)</h3>
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-6">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="text-xs font-medium text-gray-400 mb-2">Resumo do Projeto</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Slides</span>
                      <span className="text-white">{projectState.project?.totalSlides || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Duração</span>
                      <span className="text-white">{projectState.project?.duration || 0}s</span>
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
                      Gerar Narração (All)
                    </>
                  )}
                </Button>
              </div>
            </ScrollArea>
          </div>
        ) : activeTab === 'export' ? (
          <div className="h-full flex flex-col p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Exportar Vídeo</h3>
            <div className="flex-1 flex flex-col gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                <Film className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-sm font-medium text-white">Full HD 1080p</div>
                <div className="text-xs text-gray-500">MP4 H.264</div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                size="lg"
                className="w-full mt-auto bg-green-600 hover:bg-green-500 text-white"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Renderizando...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Exportar Vídeo Final
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null
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
              <h2 className="text-sm font-medium text-white">{projectState.project?.name || 'Sem Título'}</h2>
              {projectState.project?.status && (
                <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-gray-400">
                  {projectState.project.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Auto-saved</span>
            </div>
          </div>

          {/* The Actual Canvas */}
          <div className="flex-1 bg-[#0f1115] relative overflow-hidden">
            {projectState.data.canvasData || projectState.project?.slidesData ? (
              <FabricCanvasEditor
                width={1280} // Explicit full HD ratio
                height={720}
                projectName={projectState.project?.name}
                initialData={projectState.data.canvasData}
                onCanvasUpdate={(data) => {
                  setProjectState(prev => ({
                    ...prev,
                    data: { ...prev.data, canvasData: data }
                  }))
                }}
                // Phase 4 Connection
                onSelectionChange={handleSelectionChange}
                selectedElement={selectedElement}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>Selecione um slide para editar</p>
              </div>
            )}
          </div>
        </div>
      )}
    </StudioLayout>
  )
}
