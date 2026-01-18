'use client'

/**
 * PPTX Upload Wizard
 * Wizard completo para upload de PPTX e conversão em Scenes
 * Com progress tracking e preview
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Progress } from '@components/ui/progress'
import { Switch } from '@components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@components/ui/card'
import {
  Upload, FileType, Loader2, CheckCircle2, XCircle,
  User, Music, MessageSquare, Zap, FileVideo,
  ChevronRight, Settings, Sparkles
} from 'lucide-react'
import { cn } from '@lib/utils'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export interface UploadOptions {
  avatarId?: string
  avatarProvider?: 'did' | 'heygen' | 'rpm'
  voiceId?: string
  generateSubtitles: boolean
  autoTransitions: boolean
  musicUrl?: string
  defaultDuration: number
}

export interface ConversionProgress {
  phase: 'parsing' | 'sanitizing' | 'creating' | 'optimizing' | 'completed'
  percentage: number
  message: string
  currentSlide?: number
  totalSlides?: number
  errors?: string[]
}

export interface ConversionResult {
  success: boolean
  projectId: string
  scenesCreated: number
  scenes: Array<{
    id: string
    name: string
    orderIndex: number
  }>
  errors: string[]
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface PPTXUploadWizardProps {
  projectId: string
  onComplete: (result: ConversionResult) => void
  onCancel: () => void
  isOpen: boolean
}

export const PPTXUploadWizard: React.FC<PPTXUploadWizardProps> = ({
  projectId,
  onComplete,
  onCancel,
  isOpen
}) => {
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<UploadOptions>({
    generateSubtitles: true,
    autoTransitions: true,
    defaultDuration: 5000
  })
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<ConversionProgress | null>(null)
  const [result, setResult] = useState<ConversionResult | null>(null)

  // Handlers
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.pptx')) {
        toast.error('Apenas arquivos PPTX são suportados')
        return
      }

      // Validate file size (50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 50MB.')
        return
      }

      setFile(selectedFile)
      setStep(2)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return

    setIsUploading(true)
    setStep(3)
    setProgress({
      phase: 'parsing',
      percentage: 0,
      message: 'Iniciando conversão...'
    })

    try {
      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('generateSubtitles', String(options.generateSubtitles))
      formData.append('autoTransitions', String(options.autoTransitions))
      formData.append('defaultDuration', String(options.defaultDuration))

      if (options.avatarId) {
        formData.append('avatarId', options.avatarId)
      }
      if (options.avatarProvider) {
        formData.append('avatarProvider', options.avatarProvider)
      }
      if (options.voiceId) {
        formData.append('voiceId', options.voiceId)
      }
      if (options.musicUrl) {
        formData.append('musicUrl', options.musicUrl)
      }

      // Upload and convert
      const response = await fetch('/api/studio/convert-pptx', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Conversão falhou')
      }

      // Simulate progress updates (in real implementation, use SSE)
      if (data.progress && data.progress.length > 0) {
        for (const prog of data.progress) {
          setProgress(prog)
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      setResult(data)
      setProgress({
        phase: 'completed',
        percentage: 100,
        message: `✓ ${data.scenesCreated} cenas criadas com sucesso!`
      })

      toast.success(`PPTX convertido! ${data.scenesCreated} cenas criadas.`)

      // Wait a bit before calling onComplete
      setTimeout(() => {
        onComplete(data)
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      setProgress({
        phase: 'completed',
        percentage: 0,
        message: 'Erro na conversão',
        errors: [error instanceof Error ? error.message : String(error)]
      })
      toast.error('Falha ao converter PPTX')
    } finally {
      setIsUploading(false)
    }
  }, [file, projectId, options, onComplete])

  const handleReset = useCallback(() => {
    setFile(null)
    setStep(1)
    setProgress(null)
    setResult(null)
    setIsUploading(false)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="h-5 w-5 text-purple-500" />
            Importar Apresentação PPTX
          </DialogTitle>
          <DialogDescription>
            Converta sua apresentação PowerPoint em cenas editáveis
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Configurar' },
            { num: 3, label: 'Converter' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s.num
                    ? "bg-purple-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step > s.num ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    s.num
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium hidden md:block",
                  step >= s.num ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2",
                  step > s.num ? "bg-purple-500" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Clique para selecionar ou arraste o arquivo PPTX
              </p>
              <p className="text-xs text-muted-foreground">
                Máximo 50MB • Formato: .pptx
              </p>
              <input
                id="file-input"
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {file && (
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileType className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setStep(2)}
                    size="sm"
                  >
                    Continuar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Default Duration */}
                <div className="space-y-2">
                  <Label className="text-xs">Duração padrão por slide</Label>
                  <Select
                    value={String(options.defaultDuration)}
                    onValueChange={(val) => setOptions(prev => ({
                      ...prev,
                      defaultDuration: parseInt(val)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3000">3 segundos</SelectItem>
                      <SelectItem value="5000">5 segundos</SelectItem>
                      <SelectItem value="7000">7 segundos</SelectItem>
                      <SelectItem value="10000">10 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto Transitions */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      Transições automáticas
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Adiciona fade entre cenas
                    </p>
                  </div>
                  <Switch
                    checked={options.autoTransitions}
                    onCheckedChange={(checked) => setOptions(prev => ({
                      ...prev,
                      autoTransitions: checked
                    }))}
                  />
                </div>

                {/* Subtitles */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Gerar legendas
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cria legendas a partir do texto
                    </p>
                  </div>
                  <Switch
                    checked={options.generateSubtitles}
                    onCheckedChange={(checked) => setOptions(prev => ({
                      ...prev,
                      generateSubtitles: checked
                    }))}
                  />
                </div>

                {/* Avatar (Optional) */}
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Avatar (opcional)
                  </Label>
                  <Input
                    placeholder="ID do avatar"
                    value={options.avatarId || ''}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      avatarId: e.target.value || undefined
                    }))}
                  />
                </div>

                {/* Music (Optional) */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Music className="h-3 w-3" />
                    Música de fundo (opcional)
                  </Label>
                  <Input
                    placeholder="URL da música"
                    value={options.musicUrl || ''}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      musicUrl: e.target.value || undefined
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Convertendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Converter
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Converting */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {progress && (
              <>
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{progress.phase}</span>
                    <span className="text-muted-foreground">
                      {Math.round(progress.percentage)}%
                    </span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progress.message}
                  </p>
                  {progress.currentSlide !== undefined && progress.totalSlides && (
                    <p className="text-xs text-muted-foreground">
                      Slide {progress.currentSlide + 1} de {progress.totalSlides}
                    </p>
                  )}
                </div>

                {/* Status Icon */}
                <div className="flex justify-center py-8">
                  {progress.phase === 'completed' ? (
                    progress.errors && progress.errors.length > 0 ? (
                      <XCircle className="h-16 w-16 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-16 w-16 text-green-500" />
                    )
                  ) : (
                    <Loader2 className="h-16 w-16 text-purple-500 animate-spin" />
                  )}
                </div>

                {/* Errors */}
                {progress.errors && progress.errors.length > 0 && (
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-sm text-destructive">
                        Erros Encontrados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1">
                        {progress.errors.map((error, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                {progress.phase === 'completed' && (
                  <div className="flex justify-end gap-2">
                    {progress.errors && progress.errors.length > 0 ? (
                      <Button onClick={handleReset}>
                        Tentar Novamente
                      </Button>
                    ) : (
                      <Button onClick={() => result && onComplete(result)}>
                        Ir para Editor
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PPTXUploadWizard
