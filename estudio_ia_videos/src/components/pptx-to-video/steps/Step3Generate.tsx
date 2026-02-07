/**
 * Step3Generate - Passo 3: Geração do vídeo
 *
 * Features:
 * - Resumo das configurações
 * - Seleção de qualidade
 * - Progresso da geração
 * - Download do vídeo
 */
'use client';

import { useState } from 'react';
import { UsePPTXToVideoReturn } from '../hooks/usePPTXToVideo';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  Play,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Video,
  User,
  Mic,
  Music,
  Subtitles,
  Settings,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface Step3GenerateProps {
  wizard: UsePPTXToVideoReturn;
}

const QUALITY_OPTIONS = [
  { value: '720p', label: '720p HD', description: 'Mais rápido, arquivo menor' },
  { value: '1080p', label: '1080p Full HD', description: 'Recomendado' },
  { value: '4k', label: '4K Ultra HD', description: 'Maior qualidade, arquivo maior' },
] as const;

const STAGE_MESSAGES: Record<string, { icon: typeof Video; label: string }> = {
  idle: { icon: Video, label: 'Aguardando início...' },
  preparing: { icon: Settings, label: 'Preparando geração...' },
  tts: { icon: Mic, label: 'Gerando narração...' },
  avatar: { icon: User, label: 'Renderizando avatar...' },
  composing: { icon: Video, label: 'Compondo vídeo...' },
  subtitles: { icon: Subtitles, label: 'Adicionando legendas...' },
  music: { icon: Music, label: 'Mixando áudio...' },
  finalizing: { icon: Settings, label: 'Finalizando...' },
  complete: { icon: CheckCircle, label: 'Concluído!' },
  error: { icon: XCircle, label: 'Erro na geração' },
};

export function Step3Generate({ wizard }: Step3GenerateProps) {
  const [copied, setCopied] = useState(false);
  const { generationProgress, result, isLoading } = wizard;

  const handleCopyUrl = () => {
    if (result?.videoUrl) {
      navigator.clipboard.writeText(result.videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show result if generation is complete
  if (result?.success) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Vídeo Gerado com Sucesso!</h2>
          <p className="text-muted-foreground mb-8">
            Seu vídeo está pronto para download
          </p>

          {/* Video Preview */}
          {result.videoUrl && (
            <div className="mb-8 rounded-xl overflow-hidden bg-black aspect-video">
              <video
                src={result.videoUrl}
                controls
                className="w-full h-full"
                poster={wizard.slides[0]?.thumbnailUrl}
              />
            </div>
          )}

          {/* Video Info */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-muted-foreground">Duração</div>
              <div className="font-semibold">
                {result.duration ? `${Math.floor(result.duration / 60)}:${String(Math.floor(result.duration % 60)).padStart(2, '0')}` : '-'}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-muted-foreground">Tamanho</div>
              <div className="font-semibold">
                {result.fileSize ? `${(result.fileSize / 1024 / 1024).toFixed(1)} MB` : '-'}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-muted-foreground">Qualidade</div>
              <div className="font-semibold">{wizard.settings.quality}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <a href={result.videoUrl} download>
                <Download className="w-5 h-5 mr-2" />
                Download Vídeo
              </a>
            </Button>

            {result.subtitlesUrl && (
              <Button size="lg" variant="outline" asChild>
                <a href={result.subtitlesUrl} download>
                  <Subtitles className="w-5 h-5 mr-2" />
                  Download Legendas
                </a>
              </Button>
            )}

            <Button size="lg" variant="outline" onClick={handleCopyUrl}>
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  Copiar Link
                </>
              )}
            </Button>
          </div>

          {/* New Video Button */}
          <div className="mt-8 pt-6 border-t">
            <Button variant="ghost" onClick={wizard.reset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Criar Novo Vídeo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show progress if generating
  if (isLoading) {
    const StageIcon = STAGE_MESSAGES[generationProgress.stage]?.icon || Video;

    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center py-8">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900/30" />
            <div
              className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
              style={{ animationDuration: '2s' }}
            />
            <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
              <StageIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2">
            {STAGE_MESSAGES[generationProgress.stage]?.label || 'Processando...'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {generationProgress.message || 'Aguarde enquanto geramos seu vídeo'}
          </p>

          {/* Progress Bar */}
          <Progress value={generationProgress.progress} className="h-3 mb-2" />
          <div className="text-sm text-muted-foreground">
            {generationProgress.progress}% concluído
            {generationProgress.currentSlide && generationProgress.totalSlides && (
              <span>
                {' '}
                • Slide {generationProgress.currentSlide}/{generationProgress.totalSlides}
              </span>
            )}
          </div>

          {/* Stage Steps */}
          <div className="mt-8 text-left">
            <div className="space-y-2 text-sm">
              {['preparing', 'tts', 'avatar', 'composing', 'subtitles', 'music', 'finalizing'].map((stage, index) => {
                const isComplete = generationProgress.progress > (index + 1) * 12;
                const isCurrent = generationProgress.stage === stage;
                const StageIconComponent = STAGE_MESSAGES[stage]?.icon || Video;

                return (
                  <div
                    key={stage}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg transition-colors',
                      isCurrent && 'bg-blue-50 dark:bg-blue-950/30',
                      isComplete && 'text-green-600'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : (
                      <StageIconComponent className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={cn(!isComplete && !isCurrent && 'text-muted-foreground')}>
                      {STAGE_MESSAGES[stage]?.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show configuration before generating
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2 text-center">Pronto para Gerar!</h2>
        <p className="text-muted-foreground text-center mb-8">
          Revise as configurações e clique em gerar
        </p>

        {/* Summary */}
        <div className="bg-muted/50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Resumo da Configuração
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Slides */}
            <div className="flex items-start gap-3">
              <Video className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Slides</div>
                <div className="text-sm text-muted-foreground">
                  {wizard.selectedSlidesCount} slides • {wizard.totalDuration}s
                </div>
              </div>
            </div>

            {/* Avatar */}
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <div className="font-medium">Avatar</div>
                <div className="text-sm text-muted-foreground">
                  {wizard.settings.avatar?.name || 'Nenhum (apenas slides)'}
                </div>
              </div>
            </div>

            {/* Voice */}
            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Voz</div>
                <div className="text-sm text-muted-foreground">
                  {wizard.settings.voice?.name || 'Não selecionada'}
                </div>
              </div>
            </div>

            {/* Music */}
            <div className="flex items-start gap-3">
              <Music className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <div className="font-medium">Música</div>
                <div className="text-sm text-muted-foreground">
                  {wizard.settings.music
                    ? `${wizard.settings.music.title} (${wizard.settings.musicVolume}%)`
                    : 'Nenhuma'}
                </div>
              </div>
            </div>

            {/* Subtitles */}
            <div className="flex items-start gap-3">
              <Subtitles className="w-5 h-5 text-cyan-500 mt-0.5" />
              <div>
                <div className="font-medium">Legendas</div>
                <div className="text-sm text-muted-foreground">
                  {wizard.settings.subtitlesEnabled
                    ? `Ativadas (${wizard.settings.subtitleStyle})`
                    : 'Desativadas'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Selection */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Qualidade do Vídeo</h3>
          <RadioGroup
            value={wizard.settings.quality}
            onValueChange={(v) => wizard.setQuality(v as '720p' | '1080p' | '4k')}
            className="grid grid-cols-3 gap-4"
          >
            {QUALITY_OPTIONS.map((option) => (
              <div key={option.value}>
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.value}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all',
                    'hover:bg-muted/50',
                    'peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-950/30'
                  )}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Error Display */}
        {generationProgress.stage === 'error' && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-3">
            <XCircle className="w-5 h-5" />
            <span>{generationProgress.message || 'Erro na geração do vídeo'}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button variant="ghost" onClick={wizard.prevStep}>
            <ChevronLeft className="w-5 h-5 mr-1" />
            Voltar
          </Button>

          <Button size="lg" onClick={wizard.generateVideo} className="px-8">
            <Play className="w-5 h-5 mr-2" />
            Gerar Vídeo
          </Button>
        </div>
      </div>
    </div>
  );
}
