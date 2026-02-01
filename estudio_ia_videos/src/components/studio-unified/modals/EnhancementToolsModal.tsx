'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Palette,
  Volume2,
  Subtitles,
  Sparkles,
  Film,
  ImageMinus,
  Smile,
  Crop,
  Wand2,
  Play,
  RotateCcw,
  Check,
  Loader2,
  SlidersHorizontal,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Music,
  Mic,
  VolumeX,
  Waves,
  Type,
  Languages,
  Clock,
  Zap,
  Scissors,
  ScanLine,
  User,
  Focus,
  Move,
  Maximize,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface EnhancementToolsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipId?: string;
  clipType?: 'video' | 'audio' | 'image';
}

type EnhancementTool = 
  | 'color' 
  | 'audio' 
  | 'subtitles' 
  | 'effects' 
  | 'scenes' 
  | 'background' 
  | 'face' 
  | 'transform';

interface ColorSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  vibrance: number;
}

interface AudioSettings {
  volume: number;
  bass: number;
  treble: number;
  noiseReduction: number;
  normalize: boolean;
  compressor: boolean;
  pan: number;
}

interface SubtitleSettings {
  language: string;
  autoGenerate: boolean;
  translateTo: string[];
  fontSize: number;
  position: 'top' | 'center' | 'bottom';
  style: 'default' | 'outline' | 'background' | 'karaoke';
}

interface TransformSettings {
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  scale: number;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const ENHANCEMENT_TOOLS: Array<{
  id: EnhancementTool;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  supportedTypes: Array<'video' | 'audio' | 'image'>;
}> = [
  {
    id: 'color',
    label: 'Correção de Cor',
    description: 'Ajuste brilho, contraste, saturação e temperatura',
    icon: Palette,
    supportedTypes: ['video', 'image'],
  },
  {
    id: 'audio',
    label: 'Áudio Enhancement',
    description: 'Equalização, redução de ruído e normalização',
    icon: Volume2,
    supportedTypes: ['video', 'audio'],
  },
  {
    id: 'subtitles',
    label: 'Legendas Auto',
    description: 'Geração automática com tradução',
    icon: Subtitles,
    badge: 'AI',
    supportedTypes: ['video', 'audio'],
  },
  {
    id: 'effects',
    label: 'Efeitos Visuais',
    description: 'Filtros, LUTs e efeitos cinematográficos',
    icon: Sparkles,
    supportedTypes: ['video', 'image'],
  },
  {
    id: 'scenes',
    label: 'Detecção de Cenas',
    description: 'Detectar e separar cenas automaticamente',
    icon: Film,
    badge: 'AI',
    supportedTypes: ['video'],
  },
  {
    id: 'background',
    label: 'Remoção de Fundo',
    description: 'Remover ou substituir background',
    icon: ImageMinus,
    badge: 'AI',
    supportedTypes: ['video', 'image'],
  },
  {
    id: 'face',
    label: 'Face Enhancement',
    description: 'Suavização, iluminação e retoques faciais',
    icon: Smile,
    badge: 'AI',
    supportedTypes: ['video', 'image'],
  },
  {
    id: 'transform',
    label: 'Crop & Transform',
    description: 'Recorte, rotação e espelhamento',
    icon: Crop,
    supportedTypes: ['video', 'image'],
  },
];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_COLOR: ColorSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  vibrance: 0,
};

const DEFAULT_AUDIO: AudioSettings = {
  volume: 100,
  bass: 0,
  treble: 0,
  noiseReduction: 0,
  normalize: false,
  compressor: false,
  pan: 0,
};

const DEFAULT_SUBTITLE: SubtitleSettings = {
  language: 'pt-BR',
  autoGenerate: true,
  translateTo: [],
  fontSize: 24,
  position: 'bottom',
  style: 'default',
};

const DEFAULT_TRANSFORM: TransformSettings = {
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  scale: 100,
};

// ============================================================================
// COMPONENTS
// ============================================================================

function ToolCard({
  tool,
  isSelected,
  onClick,
  disabled,
}: {
  tool: (typeof ENHANCEMENT_TOOLS)[0];
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = tool.icon;

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary ${
        isSelected ? 'border-primary bg-primary/5' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          {tool.badge && (
            <Badge variant="secondary" className="text-xs">
              {tool.badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-sm mt-2">{tool.label}</CardTitle>
        <CardDescription className="text-xs">{tool.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Color Correction Panel
// ----------------------------------------------------------------------------

function ColorCorrectionPanel({
  settings,
  onChange,
}: {
  settings: ColorSettings;
  onChange: (settings: ColorSettings) => void;
}) {
  const updateSetting = (key: keyof ColorSettings, value: number) => {
    onChange({ ...settings, [key]: value });
  };

  const colorControls: Array<{
    key: keyof ColorSettings;
    label: string;
    icon: React.ElementType;
    min: number;
    max: number;
  }> = [
    { key: 'brightness', label: 'Brilho', icon: Sun, min: -100, max: 100 },
    { key: 'contrast', label: 'Contraste', icon: Contrast, min: -100, max: 100 },
    { key: 'saturation', label: 'Saturação', icon: Droplets, min: -100, max: 100 },
    { key: 'temperature', label: 'Temperatura', icon: Thermometer, min: -100, max: 100 },
    { key: 'vibrance', label: 'Vibração', icon: Sparkles, min: -100, max: 100 },
    { key: 'highlights', label: 'Realces', icon: Sun, min: -100, max: 100 },
    { key: 'shadows', label: 'Sombras', icon: Contrast, min: -100, max: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Correção de Cor
        </h3>
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_COLOR)}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="grid gap-4">
        {colorControls.map(({ key, label, icon: Icon, min, max }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </Label>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {settings[key] > 0 ? '+' : ''}{settings[key]}
              </span>
            </div>
            <Slider
              value={[settings[key]]}
              onValueChange={([v]) => updateSetting(key, v)}
              min={min}
              max={max}
              step={1}
            />
          </div>
        ))}
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label>Presets Rápidos</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Cinematic', settings: { brightness: -10, contrast: 20, saturation: -20, temperature: -15, tint: 0, highlights: -10, shadows: 10, vibrance: 10 } },
            { name: 'Vivid', settings: { brightness: 5, contrast: 15, saturation: 30, temperature: 10, tint: 0, highlights: 0, shadows: 0, vibrance: 20 } },
            { name: 'B&W', settings: { brightness: 0, contrast: 20, saturation: -100, temperature: 0, tint: 0, highlights: 10, shadows: -10, vibrance: 0 } },
            { name: 'Warm', settings: { brightness: 5, contrast: 5, saturation: 10, temperature: 30, tint: 10, highlights: 5, shadows: 0, vibrance: 15 } },
          ].map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => onChange(preset.settings)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Audio Enhancement Panel
// ----------------------------------------------------------------------------

function AudioEnhancementPanel({
  settings,
  onChange,
}: {
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
}) {
  const updateSetting = <K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Áudio Enhancement
        </h3>
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_AUDIO)}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Volume & Pan */}
      <div className="grid gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              Volume
            </Label>
            <span className="text-sm text-muted-foreground">{settings.volume}%</span>
          </div>
          <Slider
            value={[settings.volume]}
            onValueChange={([v]) => updateSetting('volume', v)}
            min={0}
            max={200}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              Pan (L/R)
            </Label>
            <span className="text-sm text-muted-foreground">
              {settings.pan === 0 ? 'C' : settings.pan < 0 ? `L${Math.abs(settings.pan)}` : `R${settings.pan}`}
            </span>
          </div>
          <Slider
            value={[settings.pan]}
            onValueChange={([v]) => updateSetting('pan', v)}
            min={-100}
            max={100}
            step={1}
          />
        </div>
      </div>

      <Separator />

      {/* Equalizer */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Waves className="h-4 w-4" />
          Equalização
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Bass</span>
              <span className="text-sm text-muted-foreground">{settings.bass > 0 ? '+' : ''}{settings.bass}</span>
            </div>
            <Slider
              value={[settings.bass]}
              onValueChange={([v]) => updateSetting('bass', v)}
              min={-12}
              max={12}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Treble</span>
              <span className="text-sm text-muted-foreground">{settings.treble > 0 ? '+' : ''}{settings.treble}</span>
            </div>
            <Slider
              value={[settings.treble]}
              onValueChange={([v]) => updateSetting('treble', v)}
              min={-12}
              max={12}
              step={1}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* AI Enhancement */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Enhancement AI
        </Label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              Redução de Ruído
            </Label>
            <span className="text-sm text-muted-foreground">{settings.noiseReduction}%</span>
          </div>
          <Slider
            value={[settings.noiseReduction]}
            onValueChange={([v]) => updateSetting('noiseReduction', v)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Normalizar Volume</Label>
            <p className="text-xs text-muted-foreground">Ajusta níveis automaticamente</p>
          </div>
          <Switch
            checked={settings.normalize}
            onCheckedChange={(v) => updateSetting('normalize', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Compressor</Label>
            <p className="text-xs text-muted-foreground">Reduz diferença entre alto/baixo</p>
          </div>
          <Switch
            checked={settings.compressor}
            onCheckedChange={(v) => updateSetting('compressor', v)}
          />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Subtitles Panel
// ----------------------------------------------------------------------------

function SubtitlesPanel({
  settings,
  onChange,
  onGenerate,
  isGenerating,
}: {
  settings: SubtitleSettings;
  onChange: (settings: SubtitleSettings) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const updateSetting = <K extends keyof SubtitleSettings>(key: K, value: SubtitleSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const languages = [
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'es-ES', name: 'Español' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
  ];

  const styles = [
    { id: 'default', name: 'Padrão', description: 'Texto simples' },
    { id: 'outline', name: 'Contorno', description: 'Com borda preta' },
    { id: 'background', name: 'Background', description: 'Fundo semi-transparente' },
    { id: 'karaoke', name: 'Karaokê', description: 'Destacado por palavra' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Subtitles className="h-5 w-5" />
          Legendas Automáticas
          <Badge variant="secondary">AI</Badge>
        </h3>
      </div>

      {/* Language Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Idioma do Áudio
          </Label>
          <select
            className="w-full p-2 border rounded-md bg-background"
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value)}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Traduzir para
          </Label>
          <div className="flex flex-wrap gap-2">
            {languages
              .filter((l) => l.code !== settings.language)
              .map((lang) => {
                const isSelected = settings.translateTo.includes(lang.code);
                return (
                  <Badge
                    key={lang.code}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const newTranslate = isSelected
                        ? settings.translateTo.filter((c) => c !== lang.code)
                        : [...settings.translateTo, lang.code];
                      updateSetting('translateTo', newTranslate);
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3 mr-1" />}
                    {lang.name}
                  </Badge>
                );
              })}
          </div>
        </div>
      </div>

      <Separator />

      {/* Style Settings */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          Estilo
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {styles.map((style) => (
            <Card
              key={style.id}
              className={`cursor-pointer p-3 ${
                settings.style === style.id ? 'border-primary' : ''
              }`}
              onClick={() => updateSetting('style', style.id as SubtitleSettings['style'])}
            >
              <div className="font-medium text-sm">{style.name}</div>
              <div className="text-xs text-muted-foreground">{style.description}</div>
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Tamanho da Fonte</Label>
            <span className="text-sm text-muted-foreground">{settings.fontSize}px</span>
          </div>
          <Slider
            value={[settings.fontSize]}
            onValueChange={([v]) => updateSetting('fontSize', v)}
            min={16}
            max={48}
            step={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Posição</Label>
          <div className="flex gap-2">
            {(['top', 'center', 'bottom'] as const).map((pos) => (
              <Button
                key={pos}
                variant={settings.position === pos ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('position', pos)}
              >
                {pos === 'top' ? 'Topo' : pos === 'center' ? 'Centro' : 'Rodapé'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Generate Button */}
      <Button className="w-full" onClick={onGenerate} disabled={isGenerating}>
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando legendas...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Gerar Legendas Automaticamente
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        <Clock className="h-3 w-3 inline mr-1" />
        Tempo estimado: 2-5 minutos dependendo da duração
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Scene Detection Panel
// ----------------------------------------------------------------------------

function SceneDetectionPanel({
  onDetect,
  isDetecting,
  detectedScenes,
}: {
  onDetect: () => void;
  isDetecting: boolean;
  detectedScenes: Array<{ time: number; thumbnail: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Film className="h-5 w-5" />
          Detecção de Cenas
          <Badge variant="secondary">AI</Badge>
        </h3>
      </div>

      <p className="text-sm text-muted-foreground">
        A IA analisa o vídeo e detecta automaticamente mudanças de cena, facilitando a edição e organização do conteúdo.
      </p>

      {/* Detection Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <Label>Sensibilidade</Label>
            <p className="text-xs text-muted-foreground">Detectar mais ou menos cortes</p>
          </div>
          <select className="p-2 border rounded bg-background">
            <option value="low">Baixa (menos cenas)</option>
            <option value="medium">Média</option>
            <option value="high">Alta (mais cenas)</option>
          </select>
        </div>

        <Button className="w-full" onClick={onDetect} disabled={isDetecting}>
          {isDetecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando vídeo...
            </>
          ) : (
            <>
              <ScanLine className="h-4 w-4 mr-2" />
              Detectar Cenas
            </>
          )}
        </Button>
      </div>

      {isDetecting && (
        <div className="space-y-2">
          <Progress value={45} />
          <p className="text-xs text-muted-foreground text-center">Analisando frames...</p>
        </div>
      )}

      {/* Detected Scenes */}
      {detectedScenes.length > 0 && (
        <div className="space-y-3">
          <Label>Cenas Detectadas ({detectedScenes.length})</Label>
          <ScrollArea className="h-48">
            <div className="grid grid-cols-3 gap-2">
              {detectedScenes.map((scene, i) => (
                <div key={i} className="relative group cursor-pointer">
                  <div className="aspect-video bg-muted rounded overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Film className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center">
                    {Math.floor(scene.time / 60)}:{(scene.time % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Scissors className="h-5 w-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button variant="outline" className="w-full">
            <Scissors className="h-4 w-4 mr-2" />
            Cortar em Todas as Cenas
          </Button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Background Removal Panel
// ----------------------------------------------------------------------------

function BackgroundRemovalPanel({
  onRemove,
  isProcessing,
}: {
  onRemove: (replacement: string) => void;
  isProcessing: boolean;
}) {
  const [replacement, setReplacement] = useState<'transparent' | 'blur' | 'color' | 'image'>('transparent');
  const [bgColor, setBgColor] = useState('#00FF00');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageMinus className="h-5 w-5" />
          Remoção de Fundo
          <Badge variant="secondary">AI</Badge>
        </h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Remove automaticamente o fundo do vídeo usando IA, ideal para criar efeito de chroma key.
      </p>

      {/* Replacement Options */}
      <div className="space-y-3">
        <Label>Substituir por:</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'transparent', label: 'Transparente', icon: '🔲' },
            { id: 'blur', label: 'Desfocado', icon: '🌫️' },
            { id: 'color', label: 'Cor Sólida', icon: '🎨' },
            { id: 'image', label: 'Imagem', icon: '🖼️' },
          ].map((opt) => (
            <Card
              key={opt.id}
              className={`cursor-pointer p-3 text-center ${
                replacement === opt.id ? 'border-primary' : ''
              }`}
              onClick={() => setReplacement(opt.id as typeof replacement)}
            >
              <div className="text-2xl mb-1">{opt.icon}</div>
              <div className="text-sm">{opt.label}</div>
            </Card>
          ))}
        </div>

        {replacement === 'color' && (
          <div className="flex items-center gap-3">
            <Label>Cor:</Label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-12 h-8 rounded cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">{bgColor}</span>
          </div>
        )}

        {replacement === 'image' && (
          <Button variant="outline" className="w-full">
            <ImageMinus className="h-4 w-4 mr-2" />
            Selecionar Imagem de Fundo
          </Button>
        )}
      </div>

      <Button 
        className="w-full" 
        onClick={() => onRemove(replacement)} 
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Remover Fundo
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        ⚡ Funciona melhor com fundos uniformes
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Face Enhancement Panel
// ----------------------------------------------------------------------------

function FaceEnhancementPanel({
  onEnhance,
  isProcessing,
}: {
  onEnhance: (options: Record<string, boolean>) => void;
  isProcessing: boolean;
}) {
  const [options, setOptions] = useState({
    smoothSkin: true,
    brightenEyes: false,
    whitenTeeth: false,
    removeBleMishes: true,
    faceLight: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Smile className="h-5 w-5" />
          Face Enhancement
          <Badge variant="secondary">AI</Badge>
        </h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Aplica retoques automáticos para melhorar a aparência facial no vídeo.
      </p>

      {/* Enhancement Options */}
      <div className="space-y-3">
        {[
          { key: 'smoothSkin', label: 'Suavizar Pele', icon: User },
          { key: 'brightenEyes', label: 'Realçar Olhos', icon: Focus },
          { key: 'whitenTeeth', label: 'Clarear Dentes', icon: Smile },
          { key: 'removeBleMishes', label: 'Remover Imperfeições', icon: Wand2 },
          { key: 'faceLight', label: 'Iluminação Facial', icon: Sun },
        ].map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Icon className="h-4 w-4" />
              {label}
            </Label>
            <Switch
              checked={options[key as keyof typeof options]}
              onCheckedChange={(v) => setOptions({ ...options, [key]: v })}
            />
          </div>
        ))}
      </div>

      <Button 
        className="w-full" 
        onClick={() => onEnhance(options)} 
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando rostos...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Aplicar Enhancement
          </>
        )}
      </Button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Transform Panel
// ----------------------------------------------------------------------------

function TransformPanel({
  settings,
  onChange,
}: {
  settings: TransformSettings;
  onChange: (settings: TransformSettings) => void;
}) {
  const updateSetting = <K extends keyof TransformSettings>(key: K, value: TransformSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Crop className="h-5 w-5" />
          Crop & Transform
        </h3>
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_TRANSFORM)}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Crop Controls */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Crop className="h-4 w-4" />
          Recorte
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'cropTop', label: 'Topo' },
            { key: 'cropBottom', label: 'Base' },
            { key: 'cropLeft', label: 'Esquerda' },
            { key: 'cropRight', label: 'Direita' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {settings[key as keyof TransformSettings]}%
                </span>
              </div>
              <Slider
                value={[settings[key as keyof TransformSettings] as number]}
                onValueChange={([v]) => updateSetting(key as keyof TransformSettings, v)}
                min={0}
                max={50}
                step={1}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Rotation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Rotação
          </Label>
          <span className="text-sm text-muted-foreground">{settings.rotation}°</span>
        </div>
        <Slider
          value={[settings.rotation]}
          onValueChange={([v]) => updateSetting('rotation', v)}
          min={-180}
          max={180}
          step={1}
        />
        <div className="flex gap-2 justify-center">
          {[-90, -45, 0, 45, 90].map((deg) => (
            <Button
              key={deg}
              variant="outline"
              size="sm"
              onClick={() => updateSetting('rotation', deg)}
            >
              {deg}°
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Scale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Maximize className="h-4 w-4" />
            Escala
          </Label>
          <span className="text-sm text-muted-foreground">{settings.scale}%</span>
        </div>
        <Slider
          value={[settings.scale]}
          onValueChange={([v]) => updateSetting('scale', v)}
          min={10}
          max={200}
          step={5}
        />
      </div>

      <Separator />

      {/* Flip Controls */}
      <div className="flex gap-3">
        <Button
          variant={settings.flipHorizontal ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => updateSetting('flipHorizontal', !settings.flipHorizontal)}
        >
          <FlipHorizontal className="h-4 w-4 mr-2" />
          Horizontal
        </Button>
        <Button
          variant={settings.flipVertical ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => updateSetting('flipVertical', !settings.flipVertical)}
        >
          <FlipVertical className="h-4 w-4 mr-2" />
          Vertical
        </Button>
      </div>

      {/* Aspect Ratio Presets */}
      <div className="space-y-2">
        <Label>Aspect Ratio Presets</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { name: '16:9', label: 'Widescreen' },
            { name: '9:16', label: 'Portrait' },
            { name: '1:1', label: 'Quadrado' },
            { name: '4:3', label: 'Standard' },
            { name: '21:9', label: 'Cinema' },
          ].map((preset) => (
            <Button key={preset.name} variant="outline" size="sm">
              {preset.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Effects Panel (Placeholder)
// ----------------------------------------------------------------------------

function EffectsPanel() {
  const effects = [
    { name: 'Blur', icon: '🌫️', category: 'Básico' },
    { name: 'Sharpen', icon: '🔪', category: 'Básico' },
    { name: 'Vignette', icon: '⭕', category: 'Cinematográfico' },
    { name: 'Film Grain', icon: '📽️', category: 'Cinematográfico' },
    { name: 'Glitch', icon: '📺', category: 'Estilizado' },
    { name: 'VHS', icon: '📼', category: 'Retrô' },
    { name: 'Pixelate', icon: '🔲', category: 'Estilizado' },
    { name: 'Chromatic', icon: '🌈', category: 'Estilizado' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Efeitos Visuais
        </h3>
      </div>

      <ScrollArea className="h-80">
        <div className="grid grid-cols-2 gap-2">
          {effects.map((effect) => (
            <Card key={effect.name} className="cursor-pointer hover:border-primary p-3">
              <div className="text-center">
                <div className="text-2xl mb-2">{effect.icon}</div>
                <div className="text-sm font-medium">{effect.name}</div>
                <div className="text-xs text-muted-foreground">{effect.category}</div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground text-center">
        Clique em um efeito para pré-visualizar
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancementToolsModal({
  open,
  onOpenChange,
  clipId,
  clipType = 'video',
}: EnhancementToolsModalProps) {
  const [selectedTool, setSelectedTool] = useState<EnhancementTool | null>(null);
  const [colorSettings, setColorSettings] = useState<ColorSettings>(DEFAULT_COLOR);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO);
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(DEFAULT_SUBTITLE);
  const [transformSettings, setTransformSettings] = useState<TransformSettings>(DEFAULT_TRANSFORM);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedScenes, setDetectedScenes] = useState<Array<{ time: number; thumbnail: string }>>([]);

  const availableTools = ENHANCEMENT_TOOLS.filter((t) =>
    t.supportedTypes.includes(clipType)
  );

  const handleApply = async () => {
    setIsProcessing(true);
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    onOpenChange(false);
  };

  const handleGenerateSubtitles = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsProcessing(false);
  };

  const handleDetectScenes = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    // Mock detected scenes
    setDetectedScenes([
      { time: 0, thumbnail: '' },
      { time: 15, thumbnail: '' },
      { time: 32, thumbnail: '' },
      { time: 58, thumbnail: '' },
      { time: 89, thumbnail: '' },
      { time: 120, thumbnail: '' },
    ]);
    setIsProcessing(false);
  };

  const renderToolPanel = () => {
    switch (selectedTool) {
      case 'color':
        return <ColorCorrectionPanel settings={colorSettings} onChange={setColorSettings} />;
      case 'audio':
        return <AudioEnhancementPanel settings={audioSettings} onChange={setAudioSettings} />;
      case 'subtitles':
        return (
          <SubtitlesPanel
            settings={subtitleSettings}
            onChange={setSubtitleSettings}
            onGenerate={handleGenerateSubtitles}
            isGenerating={isProcessing}
          />
        );
      case 'effects':
        return <EffectsPanel />;
      case 'scenes':
        return (
          <SceneDetectionPanel
            onDetect={handleDetectScenes}
            isDetecting={isProcessing}
            detectedScenes={detectedScenes}
          />
        );
      case 'background':
        return <BackgroundRemovalPanel onRemove={() => {}} isProcessing={isProcessing} />;
      case 'face':
        return <FaceEnhancementPanel onEnhance={() => {}} isProcessing={isProcessing} />;
      case 'transform':
        return <TransformPanel settings={transformSettings} onChange={setTransformSettings} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Ferramentas de Enhancement
          </DialogTitle>
          <DialogDescription>
            Aplique correções e efeitos avançados ao seu {clipType === 'video' ? 'vídeo' : clipType === 'audio' ? 'áudio' : 'imagem'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Tool Selection Grid */}
          <div className="w-80 flex-shrink-0">
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-2 gap-2">
                {availableTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    isSelected={selectedTool === tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Tool Panel */}
          <div className="flex-1 border-l pl-4">
            <ScrollArea className="h-full">
              {selectedTool ? (
                renderToolPanel()
              ) : (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione uma ferramenta para começar</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer Actions */}
        {selectedTool && selectedTool !== 'subtitles' && selectedTool !== 'scenes' && (
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="ghost" onClick={() => setSelectedTool(null)}>
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleApply} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EnhancementToolsModal;
