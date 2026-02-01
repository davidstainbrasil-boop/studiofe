'use client';

/**
 * Export Quality Selector Component
 * 
 * Allows users to select video quality including 4K support.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Check,
  Lock,
  Sparkles,
  Clock,
  HardDrive,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  QUALITY_PRESETS,
  ASPECT_RATIOS,
  VideoQuality,
  AspectRatio,
  QualityPreset,
  calculateDimensions,
  estimateRenderTime,
  estimateFileSize,
  formatFileSize,
  canUseQuality,
} from '@/lib/render/quality-presets';

interface ExportQualitySelectorProps {
  value: VideoQuality;
  onChange: (quality: VideoQuality) => void;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  videoDuration?: number; // seconds
  userPlan?: 'free' | 'starter' | 'professional' | 'enterprise';
  className?: string;
}

export function ExportQualitySelector({
  value,
  onChange,
  aspectRatio = '16:9',
  onAspectRatioChange,
  videoDuration = 300, // 5 min default
  userPlan = 'starter',
  className,
}: ExportQualitySelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const qualities = useMemo(() => {
    return (Object.values(QUALITY_PRESETS) as QualityPreset[]).map(preset => ({
      ...preset,
      available: canUseQuality(preset.id, userPlan),
      dimensions: calculateDimensions(preset.id, aspectRatio),
      renderTime: estimateRenderTime(videoDuration, preset.id),
      fileSize: estimateFileSize(videoDuration, preset.id),
    }));
  }, [aspectRatio, videoDuration, userPlan]);

  const selectedPreset = QUALITY_PRESETS[value];
  const selectedDimensions = calculateDimensions(value, aspectRatio);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Quality Cards */}
      <div className="grid gap-3">
        {qualities.map((preset) => (
          <QualityCard
            key={preset.id}
            preset={preset}
            isSelected={value === preset.id}
            isAvailable={preset.available}
            onClick={() => preset.available && onChange(preset.id)}
          />
        ))}
      </div>

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Settings className="w-4 h-4" />
        Opções avançadas
        <motion.span
          animate={{ rotate: showAdvanced ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
        >
          {/* Aspect Ratio */}
          {onAspectRatioChange && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Proporção da Tela
              </label>
              <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ASPECT_RATIOS) as [AspectRatio, typeof ASPECT_RATIOS[AspectRatio]][]).map(
                    ([ratio, config]) => (
                      <SelectItem key={ratio} value={ratio}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{ratio}</span>
                          <span className="text-slate-500">- {config.name}</span>
                        </span>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Technical Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Resolução</span>
              <p className="font-mono font-medium">
                {selectedDimensions.width}x{selectedDimensions.height}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Taxa de Quadros</span>
              <p className="font-mono font-medium">{selectedPreset.fps} fps</p>
            </div>
            <div>
              <span className="text-slate-500">Codec de Vídeo</span>
              <p className="font-mono font-medium uppercase">{selectedPreset.codec}</p>
            </div>
            <div>
              <span className="text-slate-500">Bitrate</span>
              <p className="font-mono font-medium">{selectedPreset.bitrate}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-violet-600" />
            <span>~{Math.ceil(estimateRenderTime(videoDuration, value) / 60)} min</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="w-4 h-4 text-violet-600" />
            <span>~{formatFileSize(estimateFileSize(videoDuration, value))}</span>
          </div>
        </div>
        <Badge variant="secondary" className="bg-violet-100 text-violet-700">
          {selectedPreset.name}
        </Badge>
      </div>
    </div>
  );
}

// Quality Card Component
interface QualityCardProps {
  preset: QualityPreset & {
    available: boolean;
    dimensions: { width: number; height: number };
    renderTime: number;
    fileSize: number;
  };
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

function QualityCard({ preset, isSelected, isAvailable, onClick }: QualityCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={!isAvailable}
            className={cn(
              'w-full p-4 rounded-lg border-2 transition-all text-left',
              isSelected
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                : isAvailable
                ? 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                : 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{preset.name}</span>
                  {preset.badge && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        preset.badge === 'Premium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      )}
                    >
                      {preset.badge === 'Premium' && <Sparkles className="w-3 h-3 mr-1" />}
                      {preset.badge}
                    </Badge>
                  )}
                  {!isAvailable && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      {preset.requiresPlan}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">{preset.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>{preset.dimensions.width}x{preset.dimensions.height}</span>
                  <span>•</span>
                  <span>{preset.fps}fps</span>
                  <span>•</span>
                  <span>~{formatFileSize(preset.fileSize)}</span>
                </div>
              </div>
              
              {/* Selected indicator */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                  isSelected
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-slate-300'
                )}
              >
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>
            </div>
          </button>
        </TooltipTrigger>
        {!isAvailable && (
          <TooltipContent>
            <p>Disponível no plano {preset.requiresPlan}</p>
            <a
              href="/pricing"
              className="text-violet-400 flex items-center gap-1 mt-1"
            >
              Fazer upgrade <ArrowUpRight className="w-3 h-3" />
            </a>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

export default ExportQualitySelector;
