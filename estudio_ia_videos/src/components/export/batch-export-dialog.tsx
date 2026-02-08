'use client'
import { logger } from '@/lib/logger';

/**
 * 🎬 Batch Export Dialog
 * 
 * Comprehensive batch export functionality for multiple projects/videos
 * with format selection, quality presets, and queue management
 */

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileVideo,
  Settings,
  Play,
  Pause,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  HardDrive,
  Zap,
  Film,
  Monitor,
  Smartphone,
  Square,
  FolderOpen,
  Plus,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================
// Types
// ============================================

export interface ExportableProject {
  id: string
  name: string
  thumbnailUrl?: string
  duration: number // seconds
  slidesCount: number
  lastModified: Date
}

export interface ExportFormat {
  id: string
  name: string
  extension: string
  icon: React.ReactNode
  description: string
}

export interface ExportPreset {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  resolution: { width: number; height: number }
  fps: number
  bitrate: number // kbps
  codec: string
  aspectRatio: string
}

export interface ExportJobConfig {
  projectId: string
  formatId: string
  presetId: string
  customSettings?: {
    resolution?: { width: number; height: number }
    fps?: number
    bitrate?: number
    codec?: string
  }
  outputPath?: string
  watermark?: boolean
  includeAudio?: boolean
  optimizeFor?: 'quality' | 'size' | 'speed'
}

export interface BatchExportJob {
  id: string
  projectId: string
  projectName: string
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  config: ExportJobConfig
  startedAt?: Date
  completedAt?: Date
  error?: string
  outputUrl?: string
  fileSize?: number
  estimatedTime?: number
}

interface BatchExportDialogProps {
  projects: ExportableProject[]
  onExport: (jobs: ExportJobConfig[]) => Promise<void>
  onCancel?: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ============================================
// Constants
// ============================================

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'mp4',
    name: 'MP4',
    extension: '.mp4',
    icon: <FileVideo className="h-4 w-4" />,
    description: 'Formato mais compatível, ideal para web e redes sociais'
  },
  {
    id: 'webm',
    name: 'WebM',
    extension: '.webm',
    icon: <Film className="h-4 w-4" />,
    description: 'Otimizado para web, menor tamanho com boa qualidade'
  },
  {
    id: 'mov',
    name: 'MOV',
    extension: '.mov',
    icon: <Film className="h-4 w-4" />,
    description: 'Formato Apple, ideal para edição profissional'
  }
]

const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube-1080',
    name: 'YouTube 1080p',
    description: 'Ideal para uploads no YouTube',
    icon: <Monitor className="h-4 w-4" />,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    bitrate: 8000,
    codec: 'h264',
    aspectRatio: '16:9'
  },
  {
    id: 'youtube-4k',
    name: 'YouTube 4K',
    description: 'Máxima qualidade para YouTube',
    icon: <Monitor className="h-4 w-4" />,
    resolution: { width: 3840, height: 2160 },
    fps: 30,
    bitrate: 35000,
    codec: 'h264',
    aspectRatio: '16:9'
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    description: 'Formato quadrado para feed',
    icon: <Square className="h-4 w-4" />,
    resolution: { width: 1080, height: 1080 },
    fps: 30,
    bitrate: 5000,
    codec: 'h264',
    aspectRatio: '1:1'
  },
  {
    id: 'instagram-stories',
    name: 'Instagram Stories/Reels',
    description: 'Formato vertical para stories',
    icon: <Smartphone className="h-4 w-4" />,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    bitrate: 5000,
    codec: 'h264',
    aspectRatio: '9:16'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Otimizado para TikTok',
    icon: <Smartphone className="h-4 w-4" />,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    bitrate: 4000,
    codec: 'h264',
    aspectRatio: '9:16'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Formato profissional',
    icon: <Monitor className="h-4 w-4" />,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    bitrate: 6000,
    codec: 'h264',
    aspectRatio: '16:9'
  },
  {
    id: 'custom',
    name: 'Personalizado',
    description: 'Configurações personalizadas',
    icon: <Settings className="h-4 w-4" />,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    bitrate: 8000,
    codec: 'h264',
    aspectRatio: '16:9'
  }
]

// ============================================
// Batch Export Dialog Component
// ============================================

export function BatchExportDialog({
  projects,
  onExport,
  onCancel,
  trigger,
  open: controlledOpen,
  onOpenChange
}: BatchExportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [selectedFormat, setSelectedFormat] = useState<string>('mp4')
  const [selectedPreset, setSelectedPreset] = useState<string>('youtube-1080')
  const [applyToAll, setApplyToAll] = useState(true)
  const [includeWatermark, setIncludeWatermark] = useState(false)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [optimizeFor, setOptimizeFor] = useState<'quality' | 'size' | 'speed'>('quality')
  const [customSettings, setCustomSettings] = useState({
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 8000
  })
  const [isExporting, setIsExporting] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'configure' | 'confirm'>('select')

  // Per-project settings (when not applying to all)
  const [projectConfigs, setProjectConfigs] = useState<Map<string, {
    format: string
    preset: string
  }>>(new Map())

  // Toggle project selection
  const toggleProject = useCallback((projectId: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  // Select all projects
  const selectAll = useCallback(() => {
    setSelectedProjects(new Set(projects.map(p => p.id)))
  }, [projects])

  // Deselect all projects
  const deselectAll = useCallback(() => {
    setSelectedProjects(new Set())
  }, [])

  // Get current preset
  const currentPreset = useMemo(() => {
    return EXPORT_PRESETS.find(p => p.id === selectedPreset) || EXPORT_PRESETS[0]
  }, [selectedPreset])

  // Calculate estimated total time
  const estimatedTime = useMemo(() => {
    const selectedProjectsList = projects.filter(p => selectedProjects.has(p.id))
    const totalDuration = selectedProjectsList.reduce((sum, p) => sum + p.duration, 0)
    // Rough estimate: 1 second of video takes ~0.5 seconds to render (varies by preset)
    const multiplier = optimizeFor === 'quality' ? 1.5 : optimizeFor === 'size' ? 1.2 : 0.8
    return Math.ceil(totalDuration * multiplier / 60) // in minutes
  }, [projects, selectedProjects, optimizeFor])

  // Calculate estimated file size
  const estimatedSize = useMemo(() => {
    const selectedProjectsList = projects.filter(p => selectedProjects.has(p.id))
    const totalDuration = selectedProjectsList.reduce((sum, p) => sum + p.duration, 0)
    const preset = currentPreset
    // Rough estimate: bitrate * duration / 8 (convert bits to bytes)
    const sizeBytes = (preset.bitrate * 1000 * totalDuration) / 8
    return formatFileSize(sizeBytes)
  }, [projects, selectedProjects, currentPreset])

  // Handle export
  const handleExport = useCallback(async () => {
    if (selectedProjects.size === 0) return

    setIsExporting(true)
    
    try {
      const jobs: ExportJobConfig[] = Array.from(selectedProjects).map(projectId => {
        const projectConfig = projectConfigs.get(projectId)
        const format = applyToAll ? selectedFormat : (projectConfig?.format || selectedFormat)
        const preset = applyToAll ? selectedPreset : (projectConfig?.preset || selectedPreset)
        
        return {
          projectId,
          formatId: format,
          presetId: preset,
          customSettings: selectedPreset === 'custom' ? {
            resolution: { width: customSettings.width, height: customSettings.height },
            fps: customSettings.fps,
            bitrate: customSettings.bitrate
          } : undefined,
          watermark: includeWatermark,
          includeAudio,
          optimizeFor
        }
      })

      await onExport(jobs)
      setOpen(false)
      
      // Reset state
      setSelectedProjects(new Set())
      setCurrentStep('select')
    } catch (error) {
      logger.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [
    selectedProjects, projectConfigs, applyToAll, selectedFormat, selectedPreset,
    customSettings, includeWatermark, includeAudio, optimizeFor, onExport, setOpen
  ])

  // Handle cancel
  const handleCancel = useCallback(() => {
    setOpen(false)
    onCancel?.()
  }, [setOpen, onCancel])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportação em Lote
          </DialogTitle>
          <DialogDescription>
            Exporte múltiplos projetos de uma vez com configurações personalizadas
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {['select', 'configure', 'confirm'].map((step, index) => (
            <React.Fragment key={step}>
              <button
                onClick={() => setCurrentStep(step as typeof currentStep)}
                disabled={step === 'configure' && selectedProjects.size === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80',
                  step === 'configure' && selectedProjects.size === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">
                  {step === 'select' && 'Selecionar'}
                  {step === 'configure' && 'Configurar'}
                  {step === 'confirm' && 'Confirmar'}
                </span>
              </button>
              {index < 2 && (
                <ChevronDown className="h-4 w-4 rotate-[-90deg] text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Projects */}
            {currentStep === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedProjects.size} de {projects.length} selecionados
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Limpar seleção
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="grid gap-2 pr-4">
                    {projects.map(project => (
                      <ProjectSelectItem
                        key={project.id}
                        project={project}
                        selected={selectedProjects.has(project.id)}
                        onToggle={() => toggleProject(project.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {/* Step 2: Configure Export */}
            {currentStep === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full overflow-auto"
              >
                <Tabs defaultValue="format" className="h-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="format">Formato</TabsTrigger>
                    <TabsTrigger value="preset">Qualidade</TabsTrigger>
                    <TabsTrigger value="options">Opções</TabsTrigger>
                  </TabsList>

                  <TabsContent value="format" className="mt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {EXPORT_FORMATS.map(format => (
                        <button
                          key={format.id}
                          onClick={() => setSelectedFormat(format.id)}
                          className={cn(
                            'p-4 rounded-lg border-2 text-left transition-all',
                            selectedFormat === format.id
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {format.icon}
                            <span className="font-medium">{format.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="preset" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {EXPORT_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setSelectedPreset(preset.id)}
                          className={cn(
                            'p-4 rounded-lg border-2 text-left transition-all',
                            selectedPreset === preset.id
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {preset.icon}
                            <span className="font-medium">{preset.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {preset.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {preset.resolution.width}x{preset.resolution.height}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {preset.fps}fps
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {preset.aspectRatio}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Custom settings */}
                    {selectedPreset === 'custom' && (
                      <div className="mt-6 p-4 border rounded-lg space-y-4">
                        <h4 className="font-medium">Configurações Personalizadas</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Largura</Label>
                            <Input
                              type="number"
                              value={customSettings.width}
                              onChange={e => setCustomSettings(prev => ({
                                ...prev,
                                width: parseInt(e.target.value) || 1920
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Altura</Label>
                            <Input
                              type="number"
                              value={customSettings.height}
                              onChange={e => setCustomSettings(prev => ({
                                ...prev,
                                height: parseInt(e.target.value) || 1080
                              }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>FPS: {customSettings.fps}</Label>
                          <Slider
                            value={[customSettings.fps]}
                            onValueChange={([value]) => setCustomSettings(prev => ({
                              ...prev,
                              fps: value
                            }))}
                            min={15}
                            max={60}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Bitrate: {customSettings.bitrate} kbps</Label>
                          <Slider
                            value={[customSettings.bitrate]}
                            onValueChange={([value]) => setCustomSettings(prev => ({
                              ...prev,
                              bitrate: value
                            }))}
                            min={1000}
                            max={50000}
                            step={500}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="options" className="mt-4 space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Incluir Áudio</Label>
                          <p className="text-xs text-muted-foreground">
                            Manter trilha sonora e narração
                          </p>
                        </div>
                        <Checkbox
                          checked={includeAudio}
                          onCheckedChange={(checked) => setIncludeAudio(checked as boolean)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Adicionar Marca D&apos;água</Label>
                          <p className="text-xs text-muted-foreground">
                            Logo no canto inferior direito
                          </p>
                        </div>
                        <Checkbox
                          checked={includeWatermark}
                          onCheckedChange={(checked) => setIncludeWatermark(checked as boolean)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Otimizar para</Label>
                        <Select value={optimizeFor} onValueChange={(v) => setOptimizeFor(v as typeof optimizeFor)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quality">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                Qualidade (maior arquivo)
                              </div>
                            </SelectItem>
                            <SelectItem value="size">
                              <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4" />
                                Tamanho (menor arquivo)
                              </div>
                            </SelectItem>
                            <SelectItem value="speed">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Velocidade (mais rápido)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Aplicar a todos os projetos</Label>
                          <p className="text-xs text-muted-foreground">
                            Usar mesmas configurações para todos
                          </p>
                        </div>
                        <Checkbox
                          checked={applyToAll}
                          onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {currentStep === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full overflow-auto space-y-4 py-4"
              >
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <FileVideo className="h-4 w-4" />
                      <span className="text-sm">Projetos</span>
                    </div>
                    <p className="text-2xl font-bold">{selectedProjects.size}</p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Tempo estimado</span>
                    </div>
                    <p className="text-2xl font-bold">~{estimatedTime} min</p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <HardDrive className="h-4 w-4" />
                      <span className="text-sm">Tamanho estimado</span>
                    </div>
                    <p className="text-2xl font-bold">{estimatedSize}</p>
                  </div>
                </div>

                {/* Configuration summary */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">Configurações de Exportação</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Formato:</span>
                      <span className="ml-2 font-medium">
                        {EXPORT_FORMATS.find(f => f.id === selectedFormat)?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Qualidade:</span>
                      <span className="ml-2 font-medium">{currentPreset.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Resolução:</span>
                      <span className="ml-2 font-medium">
                        {currentPreset.resolution.width}x{currentPreset.resolution.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FPS:</span>
                      <span className="ml-2 font-medium">{currentPreset.fps}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Áudio:</span>
                      <span className="ml-2 font-medium">
                        {includeAudio ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Marca d&apos;água:</span>
                      <span className="ml-2 font-medium">
                        {includeWatermark ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Project list */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 text-sm font-medium">
                    Projetos selecionados
                  </div>
                  <ScrollArea className="max-h-48">
                    <div className="divide-y">
                      {projects
                        .filter(p => selectedProjects.has(p.id))
                        .map(project => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between px-4 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <FileVideo className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{project.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDuration(project.duration)} • {project.slidesCount} slides
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">Pronto</Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
            
            <div className="flex gap-2">
              {currentStep !== 'select' && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(
                    currentStep === 'confirm' ? 'configure' : 'select'
                  )}
                >
                  Voltar
                </Button>
              )}
              
              {currentStep !== 'confirm' ? (
                <Button
                  onClick={() => setCurrentStep(
                    currentStep === 'select' ? 'configure' : 'confirm'
                  )}
                  disabled={selectedProjects.size === 0}
                >
                  Próximo
                  <ChevronDown className="h-4 w-4 ml-1 rotate-[-90deg]" />
                </Button>
              ) : (
                <Button
                  onClick={handleExport}
                  disabled={isExporting || selectedProjects.size === 0}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar {selectedProjects.size} projeto{selectedProjects.size > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Project Select Item
// ============================================

function ProjectSelectItem({
  project,
  selected,
  onToggle
}: {
  project: ExportableProject
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border-2 w-full text-left transition-all',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-transparent bg-muted hover:bg-muted/80'
      )}
    >
      <Checkbox checked={selected} className="pointer-events-none" />
      
      <div className="w-16 h-9 bg-background rounded flex items-center justify-center overflow-hidden">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileVideo className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDuration(project.duration)} • {project.slidesCount} slides
        </p>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {formatRelativeDate(project.lastModified)}
      </div>
    </button>
  )
}

// ============================================
// Utilities
// ============================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} semanas atrás`
  return `${Math.floor(days / 30)} meses atrás`
}

// ============================================
// Exports
// ============================================

export default BatchExportDialog
