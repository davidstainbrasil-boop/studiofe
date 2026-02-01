'use client';

/**
 * Video Export Dialog Component
 * 
 * Complete export dialog with quality selection, format options, and progress tracking.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Film,
  Settings2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportQualitySelector } from './export-quality-selector';
import { cn } from '@/lib/utils';
import { VideoQuality, AspectRatio } from '@/lib/render/quality-presets';
import { toast } from 'sonner';

export type ExportStatus = 'idle' | 'preparing' | 'rendering' | 'completed' | 'failed';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  totalSlides: number;
  estimatedDuration: number; // seconds
  userPlan?: 'free' | 'starter' | 'professional' | 'enterprise';
  onExport: (config: ExportConfig) => Promise<ExportResult>;
}

interface ExportConfig {
  quality: VideoQuality;
  aspectRatio: AspectRatio;
  format: 'mp4' | 'webm' | 'mov';
  includeSubtitles: boolean;
  includeWatermark: boolean;
}

interface ExportResult {
  success: boolean;
  videoUrl?: string;
  jobId?: string;
  error?: string;
}

interface RenderProgress {
  status: ExportStatus;
  progress: number;
  currentSlide?: number;
  message?: string;
}

const FORMAT_OPTIONS = [
  { id: 'mp4', name: 'MP4', description: 'Mais compatível', icon: '🎬' },
  { id: 'webm', name: 'WebM', description: 'Menor tamanho', icon: '🌐' },
  { id: 'mov', name: 'MOV', description: 'Alta qualidade', icon: '🎞️' },
] as const;

export function ExportDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  totalSlides,
  estimatedDuration,
  userPlan = 'starter',
  onExport,
}: ExportDialogProps) {
  // Export config state
  const [quality, setQuality] = useState<VideoQuality>('high');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [format, setFormat] = useState<'mp4' | 'webm' | 'mov'>('mp4');
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(userPlan === 'free');

  // Render progress state
  const [renderProgress, setRenderProgress] = useState<RenderProgress>({
    status: 'idle',
    progress: 0,
  });
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setRenderProgress({ status: 'preparing', progress: 0, message: 'Preparando renderização...' });

    try {
      // Simulate preparation
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRenderProgress({ 
        status: 'rendering', 
        progress: 5, 
        currentSlide: 1,
        message: 'Iniciando renderização...' 
      });

      const result = await onExport({
        quality,
        aspectRatio,
        format,
        includeSubtitles,
        includeWatermark,
      });

      if (result.success && result.videoUrl) {
        setVideoUrl(result.videoUrl);
        setJobId(result.jobId || null);
        setRenderProgress({ 
          status: 'completed', 
          progress: 100,
          message: 'Vídeo exportado com sucesso!' 
        });
      } else {
        throw new Error(result.error || 'Falha na exportação');
      }
    } catch (error) {
      setRenderProgress({
        status: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }, [quality, aspectRatio, format, includeSubtitles, includeWatermark, onExport]);

  const handleCopyUrl = useCallback(() => {
    if (videoUrl) {
      navigator.clipboard.writeText(videoUrl);
      toast.success('URL copiada!');
    }
  }, [videoUrl]);

  const handleReset = useCallback(() => {
    setRenderProgress({ status: 'idle', progress: 0 });
    setVideoUrl(null);
    setJobId(null);
  }, []);

  const isExporting = renderProgress.status === 'preparing' || renderProgress.status === 'rendering';

  return (
    <Dialog open={open} onOpenChange={isExporting ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-violet-600" />
            Exportar Vídeo
          </DialogTitle>
          <DialogDescription>
            {projectName} • {totalSlides} slides • ~{Math.ceil(estimatedDuration / 60)} min
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {renderProgress.status === 'idle' ? (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Tabs defaultValue="quality" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quality">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Qualidade
                  </TabsTrigger>
                  <TabsTrigger value="format">
                    <Film className="w-4 h-4 mr-2" />
                    Formato
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="quality" className="mt-4">
                  <ExportQualitySelector
                    value={quality}
                    onChange={setQuality}
                    aspectRatio={aspectRatio}
                    onAspectRatioChange={setAspectRatio}
                    videoDuration={estimatedDuration}
                    userPlan={userPlan}
                  />
                </TabsContent>

                <TabsContent value="format" className="mt-4">
                  <div className="space-y-4">
                    {/* Format Selection */}
                    <div>
                      <label className="text-sm font-medium mb-3 block">
                        Formato de Saída
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {FORMAT_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setFormat(option.id)}
                            className={cn(
                              'p-4 rounded-lg border-2 text-center transition-all',
                              format === option.id
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                            )}
                          >
                            <span className="text-2xl">{option.icon}</span>
                            <p className="font-semibold mt-2">{option.name}</p>
                            <p className="text-xs text-slate-500">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium block">Opções Adicionais</label>
                      
                      <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSubtitles}
                          onChange={(e) => setIncludeSubtitles(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <div>
                          <p className="font-medium">Incluir legendas</p>
                          <p className="text-xs text-slate-500">Legendas automáticas no vídeo</p>
                        </div>
                      </label>

                      <label
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer',
                          userPlan === 'free'
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={includeWatermark}
                          onChange={(e) => setIncludeWatermark(e.target.checked)}
                          disabled={userPlan === 'free'}
                          className="rounded border-slate-300"
                        />
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            Marca d&apos;água
                            {userPlan === 'free' && (
                              <Badge variant="outline" className="text-xs">
                                Obrigatório no plano Free
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            Adicionar logo TécnicoCursos
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          ) : renderProgress.status === 'completed' ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Exportação Concluída!</h3>
              <p className="text-slate-500 mb-6">Seu vídeo está pronto para download.</p>
              
              {videoUrl && (
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <a href={videoUrl} download>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Vídeo
                      </a>
                    </Button>
                    <Button variant="outline" onClick={handleCopyUrl}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar URL
                    </Button>
                  </div>
                  
                  <Button variant="ghost" asChild>
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir em nova aba
                    </a>
                  </Button>
                </div>
              )}
            </motion.div>
          ) : renderProgress.status === 'failed' ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Falha na Exportação</h3>
              <p className="text-slate-500 mb-6">{renderProgress.message}</p>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={handleExport}>
                  Tentar Novamente
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Voltar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8"
            >
              <div className="text-center mb-6">
                <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold">{renderProgress.message}</h3>
                {renderProgress.currentSlide && (
                  <p className="text-sm text-slate-500 mt-1">
                    Slide {renderProgress.currentSlide} de {totalSlides}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Progress value={renderProgress.progress} className="h-3" />
                <div className="flex justify-between text-sm text-slate-500">
                  <span>{Math.round(renderProgress.progress)}%</span>
                  <span>Não feche esta janela</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  A renderização pode levar alguns minutos dependendo da qualidade e duração do vídeo.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {renderProgress.status === 'idle' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Iniciar Exportação
              </Button>
            </>
          )}
          {renderProgress.status === 'completed' && (
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
