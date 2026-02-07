/**
 * Step1Upload - Passo 1: Upload e extração do PPTX
 *
 * Features:
 * - Drag and drop de arquivo PPTX
 * - Preview dos slides extraídos
 * - Seleção/desseleção de slides
 */
'use client';

import { useCallback, useState, useRef } from 'react';
import { UsePPTXToVideoReturn } from '../hooks/usePPTXToVideo';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  X,
  ChevronRight,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface Step1UploadProps {
  wizard: UsePPTXToVideoReturn;
}

export function Step1Upload({ wizard }: Step1UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith('.pptx')) {
        wizard.uploadAndExtract(file);
      }
    },
    [wizard]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        wizard.uploadAndExtract(file);
      }
    },
    [wizard]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Show upload zone if no file
  if (!wizard.file && wizard.slides.length === 0) {
    return (
      <div className="p-8">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200',
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center transition-colors',
                isDragging ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted'
              )}
            >
              <Upload
                className={cn(
                  'w-10 h-10 transition-colors',
                  isDragging ? 'text-blue-500' : 'text-muted-foreground'
                )}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste seu arquivo PPTX'}
              </h3>
              <p className="text-muted-foreground mb-4">
                ou clique para selecionar
              </p>
              <Button onClick={handleBrowseClick} variant="outline" size="lg">
                <FileText className="w-5 h-5 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>

            <div className="text-sm text-muted-foreground mt-4">
              Formatos aceitos: <span className="font-medium">.pptx</span>
              <br />
              Tamanho máximo: <span className="font-medium">100 MB</span>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: ImageIcon,
              title: 'Extração Inteligente',
              description: 'Slides, imagens e notas',
            },
            {
              icon: FileText,
              title: 'Preserva Conteúdo',
              description: 'Texto e formatação',
            },
            {
              icon: CheckCircle,
              title: 'Processamento Rápido',
              description: 'Em segundos',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
            >
              <feature.icon className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium text-sm">{feature.title}</div>
                <div className="text-xs text-muted-foreground">
                  {feature.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show extraction progress
  if (wizard.isLoading && wizard.extractionProgress < 100) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center py-12">
          <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-blue-500" />
          <h3 className="text-xl font-semibold mb-2">Processando apresentação...</h3>
          <p className="text-muted-foreground mb-6">
            Extraindo slides, imagens e conteúdo
          </p>
          <Progress value={wizard.extractionProgress} className="h-2" />
          <div className="text-sm text-muted-foreground mt-2">
            {wizard.extractionProgress}% concluído
          </div>
        </div>
      </div>
    );
  }

  // Show extracted slides
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold">{wizard.file?.name || 'Apresentação'}</h3>
            <p className="text-sm text-muted-foreground">
              {wizard.slides.length} slides extraídos
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => wizard.reset()}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Trocar arquivo
        </Button>
      </div>

      {/* Slide Selection */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium">{wizard.selectedSlidesCount}</span>
          <span className="text-muted-foreground"> de {wizard.slides.length} selecionados</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => wizard.selectAllSlides(true)}
            className="text-xs"
          >
            Selecionar todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => wizard.selectAllSlides(false)}
            className="text-xs"
          >
            Limpar seleção
          </Button>
        </div>
      </div>

      {/* Slides Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1">
        {wizard.slides.map((slide) => (
          <div
            key={slide.id}
            onClick={() => wizard.toggleSlideSelection(slide.id)}
            className={cn(
              'relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all duration-200',
              slide.selected
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-transparent hover:border-muted-foreground/30'
            )}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-muted relative">
              {slide.thumbnailUrl ? (
                <img
                  src={slide.thumbnailUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <FileText className="w-8 h-8" />
                </div>
              )}

              {/* Selection Overlay */}
              {slide.selected && (
                <div className="absolute inset-0 bg-blue-500/10" />
              )}

              {/* Selection Indicator */}
              <div
                className={cn(
                  'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all',
                  slide.selected
                    ? 'bg-blue-500 text-white'
                    : 'bg-black/50 text-white/70 group-hover:bg-black/70'
                )}
              >
                {slide.selected ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-medium">{slide.slideNumber}</span>
                )}
              </div>
            </div>

            {/* Slide Info */}
            <div className="p-2 bg-card">
              <div className="text-xs font-medium truncate">
                {slide.title || `Slide ${slide.slideNumber}`}
              </div>
              <div className="text-xs text-muted-foreground">
                {slide.duration}s
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning if no slides selected */}
      {wizard.selectedSlidesCount === 0 && (
        <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Selecione pelo menos um slide para continuar</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Duração total: <span className="font-medium">{wizard.totalDuration}s</span>
        </div>
        <Button
          onClick={wizard.nextStep}
          disabled={!wizard.canProceedToCustomize}
          size="lg"
        >
          Continuar
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
