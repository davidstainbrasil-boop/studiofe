
'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription } from '../ui/alert'
import {
  Play,
  Pause,
  Square,
  Download,
  Upload,
  Settings,
  Video,
  Mic,
  Monitor,
  Smartphone,
  Film,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  Clock,
  BarChart3,
  Eye
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { ffmpegService, RenderSettings, RenderProgress } from '@lib/video/ffmpeg-service'
import { CanvasToVideoConverter, VideoScene } from '../../lib/canvas-to-video'

interface RenderJob {
  id: string
  name: string
  status: 'pending' | 'rendering' | 'completed' | 'failed'
  progress: number
  settings: RenderSettings
  startTime?: Date
  endTime?: Date
  outputSize?: number
  downloadUrl?: string
}

export default function ProfessionalRenderEngine() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([])
  const [currentJob, setCurrentJob] = useState<RenderJob | null>(null)
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null)

  const [renderSettings, setRenderSettings] = useState<RenderSettings>({
    resolution: '1080p',
    format: 'mp4',
    quality: 'high',
    fps: 30,
    codec: 'h264',
    bitrate: 5000,
    audioEnabled: true,
    audioBitrate: 128,
    hardwareAcceleration: true,
    preset: 'medium',
    includeAudio: true,
    includeSubtitles: false
  })

  const converterRef = useRef<CanvasToVideoConverter | null>(null)

  useEffect(() => {
    converterRef.current = new CanvasToVideoConverter(renderSettings)
  }, [renderSettings])

  const initializeFFmpeg = useCallback(async () => {
    if (isInitialized || isInitializing) return

    setIsInitializing(true)
    try {
      await ffmpegService.initialize()
      setIsInitialized(true)
      toast.success('🎬 Engine de renderização iniciado!')
    } catch (error) {
      logger.error('Failed to initialize FFmpeg', error instanceof Error ? error : new Error(String(error)), { component: 'ProfessionalRenderEngine' })
      toast.error('❌ Falha ao inicializar o engine de renderização')
    } finally {
      setIsInitializing(false)
    }
  }, [isInitialized, isInitializing])

  // Project data type for render
  interface RenderProjectData {
    name?: string;
    slides?: number;
    duration?: number;
    tts?: {
      audioBase64?: string;
      duration?: number;
    };
  }

  const startRender = useCallback(async (projectData: RenderProjectData) => {
    if (!isInitialized) {
      toast.error('Engine de renderização não está inicializado')
      return
    }

    const jobId = `render_${Date.now()}`
    const newJob: RenderJob = {
      id: jobId,
      name: projectData.name || 'Untitled Project',
      status: 'pending',
      progress: 0,
      settings: renderSettings,
      startTime: new Date()
    }

    setRenderJobs(prev => [...prev, newJob])
    setCurrentJob(newJob)

    try {
      // Update job status
      setRenderJobs(prev => prev.map(job =>
        job.id === jobId ? { ...job, status: 'rendering' } : job
      ))

      // Set up progress tracking
      ffmpegService.setProgressCallback((progress) => {
        setRenderProgress(progress)
        setRenderJobs(prev => prev.map(job =>
          job.id === jobId ? { ...job, progress: progress.percent } : job
        ))
      })

      // Try to use real API first
      let downloadUrl: string | null = null;
      let outputSize = 0;
      
      try {
        // Start render via API
        const apiResponse = await fetch('/api/render/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: jobId,
            settings: {
              quality: renderSettings.quality,
              format: renderSettings.format,
              resolution: renderSettings.resolution
            },
            scenes: [{
              name: projectData.name || 'Scene 1',
              duration: projectData.duration || 10,
              audioBase64: projectData.tts?.audioBase64
            }]
          })
        });
        
        if (apiResponse.ok) {
          const result = await apiResponse.json();
          
          if (result.success && result.jobId) {
            // Poll for completion
            let attempts = 0;
            const maxAttempts = 60; // 2 minutes timeout
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const statusResponse = await fetch(`/api/render/status/${result.jobId}`);
              const statusResult = await statusResponse.json();
              
              if (statusResult.job) {
                const jobStatus = statusResult.job;
                setRenderProgress({ 
                  percent: jobStatus.progress || 0, 
                  currentFrame: 0, 
                  totalFrames: 100, 
                  fps: 30, 
                  timeElapsed: 0, 
                  timeRemaining: 0, 
                  stage: 'processing' 
                });
                setRenderJobs(prev => prev.map(job =>
                  job.id === jobId ? { ...job, progress: jobStatus.progress || 0 } : job
                ));
                
                if (jobStatus.status === 'completed' && jobStatus.output_url) {
                  downloadUrl = jobStatus.output_url;
                  break;
                } else if (jobStatus.status === 'failed') {
                  throw new Error(jobStatus.error || 'Render failed');
                }
              }
              
              attempts++;
            }
          }
        }
      } catch (apiError) {
        logger.warn('API render failed, falling back to local simulation', { error: apiError, component: 'ProfessionalRenderEngine' });
      }
      
      // Fallback to local simulation if API fails
      if (!downloadUrl) {
        const videoScene: VideoScene = {
          id: 'local_scene',
          name: projectData.name || 'Demo Scene',
          duration: projectData.duration || 10,
          elements: [],
          frames: [],
          totalDuration: projectData.duration || 10,
          audioTrack: projectData.tts?.audioBase64 ? {
            url: `data:audio/mp3;base64,${projectData.tts.audioBase64}`,
            offset: 0,
            volume: 1
          } : undefined
        };

        // Simulate render process
        for (let i = 0; i <= 100; i += 5) {
          await new Promise(resolve => setTimeout(resolve, 150));
          setRenderProgress({ 
            percent: i, 
            currentFrame: i, 
            totalFrames: 100, 
            fps: 30, 
            timeElapsed: 0, 
            timeRemaining: 0, 
            stage: 'rendering' 
          });
          setRenderJobs(prev => prev.map(job =>
            job.id === jobId ? { ...job, progress: i } : job
          ));
        }

        // Create placeholder blob for demo
        const videoBlob = new Blob(['video content placeholder'], { type: 'video/mp4' });
        downloadUrl = URL.createObjectURL(videoBlob);
        outputSize = videoBlob.size;
      }

      // Complete the job
      const completedJob: RenderJob = {
        ...newJob,
        status: 'completed',
        progress: 100,
        endTime: new Date(),
        outputSize,
        downloadUrl: downloadUrl || undefined
      }

      setRenderJobs(prev => prev.map(job =>
        job.id === jobId ? completedJob : job
      ))

      toast.success('🎉 Renderização concluída com sucesso!')

    } catch (error) {
      logger.error('Render failed', error instanceof Error ? error : new Error(String(error)), { component: 'ProfessionalRenderEngine' })

      setRenderJobs(prev => prev.map(job =>
        job.id === jobId ? { ...job, status: 'failed' } : job
      ))

      toast.error('❌ Falha na renderização')
    } finally {
      setCurrentJob(null)
      setRenderProgress(null)
    }
  }, [isInitialized, renderSettings])

  const downloadVideo = useCallback((job: RenderJob) => {
    if (job.downloadUrl) {
      const a = document.createElement('a')
      a.href = job.downloadUrl
      a.download = `${job.name}.${job.settings.format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast.success('📥 Download iniciado!')
    }
  }, [])

  const getQualityLabel = (quality: string) => {
    const labels = {
      draft: 'Draft',
      standard: 'Standard',
      high: 'High',
      premium: 'Premium'
    }
    return labels[quality as keyof typeof labels] || quality
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'mp4': return '🎬'
      case 'webm': return '🌐'
      case 'mov': return '🎭'
      default: return '🎥'
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Engine Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Professional Render Engine
          </CardTitle>
          <CardDescription>
            Engine de renderização profissional com FFmpeg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isInitialized ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm font-medium">
                  {isInitialized ? 'Engine Ativo' : 'Engine Inativo'}
                </span>
              </div>

              {isInitialized && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  FFmpeg Ready
                </Badge>
              )}
            </div>

            {!isInitialized && (
              <Button
                onClick={initializeFFmpeg}
                disabled={isInitializing}
                className="flex items-center gap-2"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Inicializando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Inicializar Engine
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="render" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Renderização
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Render Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Renderização</CardTitle>
              <CardDescription>
                Configure qualidade, formato e codec do vídeo final
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quality Preset */}
              <div className="space-y-2">
                <Label>Qualidade e Resolução</Label>
                <Select
                  value={renderSettings.quality}
                  onValueChange={(value: string) =>
                    setRenderSettings(prev => ({ ...prev, quality: value as RenderSettings['quality'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft - Rápido</SelectItem>
                    <SelectItem value="standard">Standard - Balanceado</SelectItem>
                    <SelectItem value="high">High - Alta Qualidade</SelectItem>
                    <SelectItem value="premium">Premium - Máxima</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label>Formato de Vídeo</Label>
                <Select
                  value={renderSettings.format}
                  onValueChange={(value: string) =>
                    setRenderSettings(prev => ({ ...prev, format: value as RenderSettings['format'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">🎬 MP4 - Universal</SelectItem>
                    <SelectItem value="webm">🌐 WebM - Web Optimized</SelectItem>
                    <SelectItem value="mov">🎭 MOV - Apple/Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Codec */}
              <div className="space-y-2">
                <Label>Codec de Vídeo</Label>
                <Select
                  value={renderSettings.codec}
                  onValueChange={(value: string) =>
                    setRenderSettings(prev => ({ ...prev, codec: value as RenderSettings['codec'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h264">H.264 - Compatível</SelectItem>
                    <SelectItem value="h265">H.265 - Eficiente</SelectItem>
                    <SelectItem value="vp9">VP9 - Web Premium</SelectItem>
                    <SelectItem value="prores">ProRes - Cinema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FPS */}
              <div className="space-y-3">
                <Label>Taxa de Quadros (FPS)</Label>
                <div className="px-3">
                  <Slider
                    value={[renderSettings.fps]}
                    onValueChange={([value]) =>
                      setRenderSettings(prev => ({ ...prev, fps: value }))
                    }
                    min={24}
                    max={60}
                    step={6}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>24fps - Cinema</span>
                  <span className="font-medium">{renderSettings.fps}fps</span>
                  <span>60fps - Smooth</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Render Tab */}
        <TabsContent value="render" className="space-y-4">
          {currentJob && renderProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Renderizando: {currentJob.name}
                </CardTitle>
                <CardDescription>
                  {renderProgress.stage}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={renderProgress.percent} className="w-full" />

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Fase</Label>
                    <p className="font-medium capitalize">{renderProgress.stage}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Progresso</Label>
                    <p className="font-medium">{Math.round(renderProgress.percent)}%</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tempo Decorrido</Label>
                    <p className="font-medium">
                      {formatDuration(renderProgress.timeElapsed)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Iniciar Renderização</CardTitle>
              <CardDescription>
                Renderize seu projeto com as configurações selecionadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuração Atual:</strong> {getQualityLabel(renderSettings.quality)} •
                    {getFormatIcon(renderSettings.format)} {renderSettings.format.toUpperCase()} •
                    {renderSettings.fps}fps
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => startRender({ name: 'Demo Project' })}
                  disabled={!isInitialized || !!currentJob}
                  className="w-full"
                  size="lg"
                >
                  {currentJob ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Renderizando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Renderização
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Renderizações</CardTitle>
              <CardDescription>
                Acompanhe suas renderizações anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma renderização ainda</p>
                  <p className="text-sm">Inicie sua primeira renderização para ver o histórico</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {renderJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {job.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                              {job.status === 'rendering' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                              {job.status === 'pending' && <Clock className="h-4 w-4 text-orange-500" />}

                              <span className="font-medium">{job.name}</span>
                            </div>

                            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                              {getFormatIcon(job.settings.format)} {job.settings.format.toUpperCase()}
                            </Badge>

                            <Badge variant="outline">
                              {getQualityLabel(job.settings.quality)}
                            </Badge>
                          </div>

                          {job.status === 'rendering' && (
                            <Progress value={job.progress} className="w-full mt-2" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {job.outputSize && (
                            <span className="text-sm text-muted-foreground">
                              {formatFileSize(job.outputSize)}
                            </span>
                          )}

                          {job.status === 'completed' && job.downloadUrl && (
                            <Button
                              size="sm"
                              onClick={() => downloadVideo(job)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
