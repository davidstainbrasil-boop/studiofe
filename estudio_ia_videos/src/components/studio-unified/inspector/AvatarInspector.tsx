/**
 * 🎭 Avatar Inspector Panel
 * Configuração detalhada de avatares no Inspector
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  User,
  Mic,
  Volume2,
  Smile,
  Move,
  ZoomIn,
  RotateCw,
  Play,
  Pause,
  ChevronDown,
  Sparkles,
  Settings2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarConfig {
  avatarId: string;
  avatarName: string;
  avatarType: 'realistic' | 'animated' | 'custom';
  
  // Voice settings
  voice: {
    id: string;
    name: string;
    language: string;
    speed: number;
    pitch: number;
    volume: number;
  };
  
  // Expression settings
  expression: {
    current: string;
    intensity: number;
    autoDetect: boolean;
  };
  
  // Position settings
  position: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  
  // Visibility
  visible: boolean;
  locked: boolean;
  
  // Quality
  quality: 'draft' | 'standard' | 'high' | 'ultra';
}

interface AvatarInspectorProps {
  config: AvatarConfig;
  onConfigChange: (config: Partial<AvatarConfig>) => void;
  onGenerate?: () => void;
  onPreview?: () => void;
  isGenerating?: boolean;
  className?: string;
}

const EXPRESSIONS = [
  { id: 'neutral', label: 'Neutro', emoji: '😐' },
  { id: 'happy', label: 'Feliz', emoji: '😊' },
  { id: 'serious', label: 'Sério', emoji: '😐' },
  { id: 'excited', label: 'Empolgado', emoji: '😃' },
  { id: 'concerned', label: 'Preocupado', emoji: '😟' },
  { id: 'confident', label: 'Confiante', emoji: '😎' },
];

const VOICES = [
  { id: 'voice-1', name: 'Ana (Português BR)', language: 'pt-BR', gender: 'female' },
  { id: 'voice-2', name: 'Carlos (Português BR)', language: 'pt-BR', gender: 'male' },
  { id: 'voice-3', name: 'Maria (Português BR)', language: 'pt-BR', gender: 'female' },
  { id: 'voice-4', name: 'João (Português BR)', language: 'pt-BR', gender: 'male' },
];

const QUALITY_OPTIONS = [
  { id: 'draft', label: 'Rascunho', description: 'Rápido, baixa qualidade' },
  { id: 'standard', label: 'Padrão', description: 'Balanceado' },
  { id: 'high', label: 'Alta', description: 'Qualidade profissional' },
  { id: 'ultra', label: 'Ultra', description: 'Máxima qualidade' },
];

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{title}</span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AvatarInspector({
  config,
  onConfigChange,
  onGenerate,
  onPreview,
  isGenerating = false,
  className,
}: AvatarInspectorProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const updateVoice = useCallback(
    (updates: Partial<AvatarConfig['voice']>) => {
      onConfigChange({
        voice: { ...config.voice, ...updates },
      });
    },
    [config.voice, onConfigChange]
  );

  const updateExpression = useCallback(
    (updates: Partial<AvatarConfig['expression']>) => {
      onConfigChange({
        expression: { ...config.expression, ...updates },
      });
    },
    [config.expression, onConfigChange]
  );

  const updatePosition = useCallback(
    (updates: Partial<AvatarConfig['position']>) => {
      onConfigChange({
        position: { ...config.position, ...updates },
      });
    },
    [config.position, onConfigChange]
  );

  const handlePreviewVoice = useCallback(() => {
    setIsPlaying(!isPlaying);
    // Would trigger actual TTS preview
    setTimeout(() => setIsPlaying(false), 3000);
  }, [isPlaying]);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Avatar Header */}
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{config.avatarName}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">
                {config.avatarType}
              </Badge>
              <Badge
                variant={config.quality === 'ultra' ? 'default' : 'outline'}
                className="text-[10px]"
              >
                {QUALITY_OPTIONS.find((q) => q.id === config.quality)?.label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onConfigChange({ visible: !config.visible })}
            >
              {config.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onConfigChange({ locked: !config.locked })}
            >
              {config.locked ? (
                <Lock className="h-4 w-4 text-yellow-500" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Separator />

      {/* Voice Settings */}
      <Section title="Voz" icon={Mic}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Voz</Label>
            <Select
              value={config.voice.id}
              onValueChange={(id) => {
                const voice = VOICES.find((v) => v.id === id);
                if (voice) {
                  updateVoice({ id, name: voice.name, language: voice.language });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                      <span>{voice.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {voice.gender === 'female' ? '♀' : '♂'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Velocidade</Label>
              <span className="text-xs text-muted-foreground">{config.voice.speed}x</span>
            </div>
            <Slider
              value={[config.voice.speed]}
              onValueChange={([speed]) => updateVoice({ speed })}
              min={0.5}
              max={2}
              step={0.1}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tom</Label>
              <span className="text-xs text-muted-foreground">{config.voice.pitch}%</span>
            </div>
            <Slider
              value={[config.voice.pitch]}
              onValueChange={([pitch]) => updateVoice({ pitch })}
              min={-50}
              max={50}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Volume</Label>
              <span className="text-xs text-muted-foreground">{config.voice.volume}%</span>
            </div>
            <Slider
              value={[config.voice.volume]}
              onValueChange={([volume]) => updateVoice({ volume })}
              min={0}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handlePreviewVoice}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Parar Preview
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Preview da Voz
              </>
            )}
          </Button>
        </div>
      </Section>

      <Separator />

      {/* Expression Settings */}
      <Section title="Expressões" icon={Smile}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {EXPRESSIONS.map((expr) => (
              <Button
                key={expr.id}
                variant={config.expression.current === expr.id ? 'secondary' : 'outline'}
                size="sm"
                className="h-auto py-2 flex flex-col items-center gap-1"
                onClick={() => updateExpression({ current: expr.id })}
              >
                <span className="text-lg">{expr.emoji}</span>
                <span className="text-[10px]">{expr.label}</span>
              </Button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Intensidade</Label>
              <span className="text-xs text-muted-foreground">
                {config.expression.intensity}%
              </span>
            </div>
            <Slider
              value={[config.expression.intensity]}
              onValueChange={([intensity]) => updateExpression({ intensity })}
              min={0}
              max={100}
              step={10}
              className="mt-2"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Auto-detectar do texto</Label>
            <Switch
              checked={config.expression.autoDetect}
              onCheckedChange={(autoDetect) => updateExpression({ autoDetect })}
            />
          </div>
        </div>
      </Section>

      <Separator />

      {/* Position Settings */}
      <Section title="Posição" icon={Move}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">X</Label>
              <Slider
                value={[config.position.x]}
                onValueChange={([x]) => updatePosition({ x })}
                min={-100}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Slider
                value={[config.position.y]}
                onValueChange={([y]) => updatePosition({ y })}
                min={-100}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <ZoomIn className="h-3 w-3" />
                Escala
              </Label>
              <span className="text-xs text-muted-foreground">
                {config.position.scale}%
              </span>
            </div>
            <Slider
              value={[config.position.scale]}
              onValueChange={([scale]) => updatePosition({ scale })}
              min={10}
              max={200}
              step={5}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <RotateCw className="h-3 w-3" />
                Rotação
              </Label>
              <span className="text-xs text-muted-foreground">
                {config.position.rotation}°
              </span>
            </div>
            <Slider
              value={[config.position.rotation]}
              onValueChange={([rotation]) => updatePosition({ rotation })}
              min={-180}
              max={180}
              step={5}
              className="mt-2"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              updatePosition({ x: 0, y: 0, scale: 100, rotation: 0 })
            }
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetar Posição
          </Button>
        </div>
      </Section>

      <Separator />

      {/* Quality Settings */}
      <Section title="Qualidade" icon={Settings2} defaultOpen={false}>
        <div className="space-y-2">
          {QUALITY_OPTIONS.map((option) => (
            <Card
              key={option.id}
              className={cn(
                'p-2 cursor-pointer transition-colors',
                config.quality === option.id
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted'
              )}
              onClick={() =>
                onConfigChange({
                  quality: option.id as AvatarConfig['quality'],
                })
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {config.quality === option.id && (
                  <Badge variant="default" className="text-[10px]">
                    Ativo
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="pt-4 space-y-2">
        <Button
          className="w-full"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Gerando Avatar...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Gerar Avatar
            </>
          )}
        </Button>
        <Button variant="outline" className="w-full" onClick={onPreview}>
          <Play className="h-4 w-4 mr-2" />
          Preview Rápido
        </Button>
      </div>
    </div>
  );
}

export default AvatarInspector;
