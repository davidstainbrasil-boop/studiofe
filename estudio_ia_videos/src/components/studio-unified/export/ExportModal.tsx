'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Cloud,
  Youtube,
  MonitorPlay,
  Film,
  Settings,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Clock,
  Zap,
  FileVideo,
  Music,
  Subtitles,
  Image,
  Sparkles,
  Info,
  ChevronRight,
  Star,
  Crown,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  projectDuration?: number; // seconds
  onExport?: (settings: ExportSettings) => void;
}

interface ExportSettings {
  format: VideoFormat;
  resolution: Resolution;
  frameRate: FrameRate;
  quality: QualityPreset;
  codec: VideoCodec;
  bitrate: 'auto' | number;
  destination: ExportDestination;
  
  // Content options
  includeVideo: boolean;
  includeAudio: boolean;
  includeSubtitles: boolean;
  includeWatermark: boolean;
  includeMetadata: boolean;
  
  // Advanced
  audioCodec: AudioCodec;
  audioBitrate: number;
  twoPass: boolean;
  
  // Platform specific
  youtubePrivacy?: 'public' | 'unlisted' | 'private';
  youtubeCategory?: string;
  vimeoPrivacy?: 'anybody' | 'nobody' | 'contacts' | 'password';
}

type VideoFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'gif';
type Resolution = '4k' | '1080p' | '720p' | '480p' | 'custom';
type FrameRate = 24 | 30 | 60 | 'source';
type QualityPreset = 'maximum' | 'high' | 'medium' | 'low' | 'custom';
type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1' | 'prores';
type AudioCodec = 'aac' | 'mp3' | 'opus' | 'pcm';
type ExportDestination = 'download' | 'cloud' | 'youtube' | 'vimeo';

// ============================================================================
// CONSTANTS
// ============================================================================

const FORMAT_OPTIONS: Array<{
  id: VideoFormat;
  label: string;
  description: string;
  icon: string;
  codecs: VideoCodec[];
}> = [
  { id: 'mp4', label: 'MP4', description: 'Mais compatível', icon: '📦', codecs: ['h264', 'h265'] },
  { id: 'webm', label: 'WebM', description: 'Otimizado para web', icon: '🌐', codecs: ['vp9', 'av1'] },
  { id: 'mov', label: 'MOV', description: 'Alta qualidade', icon: '🎬', codecs: ['h264', 'prores'] },
  { id: 'gif', label: 'GIF', description: 'Animação sem áudio', icon: '🎞️', codecs: ['h264'] },
];

const RESOLUTION_OPTIONS: Array<{
  id: Resolution;
  label: string;
  dimensions: string;
  badge?: string;
}> = [
  { id: '4k', label: '4K Ultra HD', dimensions: '3840 × 2160', badge: 'PRO' },
  { id: '1080p', label: 'Full HD', dimensions: '1920 × 1080' },
  { id: '720p', label: 'HD', dimensions: '1280 × 720' },
  { id: '480p', label: 'SD', dimensions: '854 × 480' },
];

const QUALITY_PRESETS: Array<{
  id: QualityPreset;
  label: string;
  description: string;
  bitrateFactor: number;
}> = [
  { id: 'maximum', label: 'Máxima', description: 'Arquivo grande, melhor qualidade', bitrateFactor: 1.5 },
  { id: 'high', label: 'Alta', description: 'Balanço ideal', bitrateFactor: 1 },
  { id: 'medium', label: 'Média', description: 'Arquivo menor', bitrateFactor: 0.7 },
  { id: 'low', label: 'Baixa', description: 'Tamanho mínimo', bitrateFactor: 0.4 },
];

const DESTINATION_OPTIONS: Array<{
  id: ExportDestination;
  label: string;
  description: string;
  icon: React.ElementType;
  requiresAuth?: boolean;
}> = [
  { id: 'download', label: 'Download', description: 'Salvar no computador', icon: Download },
  { id: 'cloud', label: 'Cloud Storage', description: 'Salvar na nuvem', icon: Cloud },
  { id: 'youtube', label: 'YouTube', description: 'Publicar no YouTube', icon: Youtube, requiresAuth: true },
  { id: 'vimeo', label: 'Vimeo', description: 'Publicar no Vimeo', icon: MonitorPlay, requiresAuth: true },
];

const DEFAULT_SETTINGS: ExportSettings = {
  format: 'mp4',
  resolution: '1080p',
  frameRate: 30,
  quality: 'high',
  codec: 'h264',
  bitrate: 'auto',
  destination: 'download',
  includeVideo: true,
  includeAudio: true,
  includeSubtitles: true,
  includeWatermark: false,
  includeMetadata: true,
  audioCodec: 'aac',
  audioBitrate: 192,
  twoPass: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function estimateFileSize(
  duration: number,
  resolution: Resolution,
  quality: QualityPreset
): number {
  const baseBitrates: Record<Resolution, number> = {
    '4k': 35000000,
    '1080p': 8000000,
    '720p': 5000000,
    '480p': 2500000,
    'custom': 8000000,
  };
  const preset = QUALITY_PRESETS.find((p) => p.id === quality);
  const bitrate = baseBitrates[resolution] * (preset?.bitrateFactor || 1);
  return (bitrate * duration) / 8;
}

function estimateRenderTime(duration: number, resolution: Resolution): number {
  const factors: Record<Resolution, number> = {
    '4k': 4,
    '1080p': 1.5,
    '720p': 1,
    '480p': 0.7,
    'custom': 1.5,
  };
  return duration * factors[resolution] * 0.5; // Assume 0.5x real-time on average
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function FormatSelector({
  value,
  onChange,
}: {
  value: VideoFormat;
  onChange: (format: VideoFormat) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FORMAT_OPTIONS.map((format) => (
        <Card
          key={format.id}
          className={`cursor-pointer transition-all text-center p-3 ${
            value === format.id ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => onChange(format.id)}
        >
          <div className="text-2xl mb-1">{format.icon}</div>
          <div className="font-medium text-sm">{format.label}</div>
          <div className="text-[10px] text-muted-foreground">{format.description}</div>
        </Card>
      ))}
    </div>
  );
}

function ResolutionSelector({
  value,
  onChange,
}: {
  value: Resolution;
  onChange: (resolution: Resolution) => void;
}) {
  return (
    <div className="space-y-2">
      {RESOLUTION_OPTIONS.map((res) => (
        <div
          key={res.id}
          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
            value === res.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
          }`}
          onClick={() => onChange(res.id)}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full border-2 ${
                value === res.id ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}
            >
              {value === res.id && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </div>
            <div>
              <div className="font-medium text-sm">{res.label}</div>
              <div className="text-xs text-muted-foreground">{res.dimensions}</div>
            </div>
          </div>
          {res.badge && (
            <Badge variant="secondary" className="text-[10px]">
              <Crown className="h-2.5 w-2.5 mr-1" />
              {res.badge}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function DestinationSelector({
  value,
  onChange,
}: {
  value: ExportDestination;
  onChange: (dest: ExportDestination) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {DESTINATION_OPTIONS.map((dest) => {
        const Icon = dest.icon;
        return (
          <Card
            key={dest.id}
            className={`cursor-pointer transition-all p-4 ${
              value === dest.id ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => onChange(dest.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${value === dest.id ? 'bg-primary/10' : 'bg-muted'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  {dest.label}
                  {dest.requiresAuth && (
                    <Badge variant="outline" className="text-[9px] h-4">
                      Login
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{dest.description}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ContentOptions({
  settings,
  onChange,
}: {
  settings: ExportSettings;
  onChange: (settings: Partial<ExportSettings>) => void;
}) {
  const options = [
    { key: 'includeVideo', label: 'Vídeo', icon: FileVideo, description: 'Incluir trilha de vídeo' },
    { key: 'includeAudio', label: 'Áudio', icon: Music, description: 'Incluir trilhas de áudio' },
    { key: 'includeSubtitles', label: 'Legendas', icon: Subtitles, description: 'Incluir legendas geradas' },
    { key: 'includeWatermark', label: 'Marca d\'água', icon: Image, description: 'Adicionar logo/watermark' },
    { key: 'includeMetadata', label: 'Metadados', icon: Info, description: 'Incluir informações do projeto' },
  ];

  return (
    <div className="space-y-2">
      {options.map(({ key, label, icon: Icon, description }) => (
        <div
          key={key}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">{description}</div>
            </div>
          </div>
          <Switch
            checked={settings[key as keyof ExportSettings] as boolean}
            onCheckedChange={(v) => onChange({ [key]: v })}
          />
        </div>
      ))}
    </div>
  );
}

function AdvancedSettings({
  settings,
  onChange,
}: {
  settings: ExportSettings;
  onChange: (settings: Partial<ExportSettings>) => void;
}) {
  const currentFormat = FORMAT_OPTIONS.find((f) => f.id === settings.format);
  const availableCodecs = currentFormat?.codecs || ['h264'];

  return (
    <div className="space-y-4">
      {/* Video Codec */}
      <div className="space-y-2">
        <Label>Codec de Vídeo</Label>
        <Select
          value={settings.codec}
          onValueChange={(v) => onChange({ codec: v as VideoCodec })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableCodecs.map((codec) => (
              <SelectItem key={codec} value={codec}>
                {codec.toUpperCase()}
                {codec === 'h265' && ' (HEVC)'}
                {codec === 'av1' && ' (Novo)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frame Rate */}
      <div className="space-y-2">
        <Label>Taxa de Frames</Label>
        <Select
          value={String(settings.frameRate)}
          onValueChange={(v) => onChange({ frameRate: v === 'source' ? 'source' : (parseInt(v) as FrameRate) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24">24 fps (Cinema)</SelectItem>
            <SelectItem value="30">30 fps (Padrão)</SelectItem>
            <SelectItem value="60">60 fps (Suave)</SelectItem>
            <SelectItem value="source">Manter original</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audio Codec */}
      <div className="space-y-2">
        <Label>Codec de Áudio</Label>
        <Select
          value={settings.audioCodec}
          onValueChange={(v) => onChange({ audioCodec: v as AudioCodec })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aac">AAC (Recomendado)</SelectItem>
            <SelectItem value="mp3">MP3</SelectItem>
            <SelectItem value="opus">Opus (WebM)</SelectItem>
            <SelectItem value="pcm">PCM (Sem compressão)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audio Bitrate */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Bitrate de Áudio</Label>
          <span className="text-sm text-muted-foreground">{settings.audioBitrate} kbps</span>
        </div>
        <Slider
          value={[settings.audioBitrate]}
          onValueChange={([v]) => onChange({ audioBitrate: v })}
          min={64}
          max={320}
          step={32}
        />
      </div>

      {/* Two-Pass Encoding */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div>
          <Label>Codificação em 2 Passes</Label>
          <p className="text-xs text-muted-foreground">Melhor qualidade, mais lento</p>
        </div>
        <Switch
          checked={settings.twoPass}
          onCheckedChange={(v) => onChange({ twoPass: v })}
        />
      </div>
    </div>
  );
}

function ExportSummary({
  settings,
  duration,
  projectName,
}: {
  settings: ExportSettings;
  duration: number;
  projectName: string;
}) {
  const estimatedSize = estimateFileSize(duration, settings.resolution, settings.quality);
  const estimatedTime = estimateRenderTime(duration, settings.resolution);

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Resumo da Exportação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Arquivo:</span>
            <p className="font-medium truncate">{projectName}.{settings.format}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Formato:</span>
            <p className="font-medium">{settings.resolution} • {settings.frameRate}fps</p>
          </div>
          <div>
            <span className="text-muted-foreground">Duração:</span>
            <p className="font-medium">{formatDuration(duration)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Codec:</span>
            <p className="font-medium">{settings.codec.toUpperCase()}</p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>Tamanho estimado:</span>
          </div>
          <Badge variant="secondary">{formatFileSize(estimatedSize)}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Tempo estimado:</span>
          </div>
          <Badge variant="secondary">~{formatDuration(estimatedTime)}</Badge>
        </div>

        {settings.destination !== 'download' && (
          <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded text-xs text-blue-600 dark:text-blue-400">
            <Info className="h-3 w-3" />
            <span>
              {settings.destination === 'youtube' && 'Será publicado no YouTube após renderização'}
              {settings.destination === 'vimeo' && 'Será publicado no Vimeo após renderização'}
              {settings.destination === 'cloud' && 'Será salvo no seu armazenamento em nuvem'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExportModal({
  open,
  onOpenChange,
  projectName = 'Meu Projeto',
  projectDuration = 180,
  onExport,
}: ExportModalProps) {
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState('format');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const updateSettings = (changes: Partial<ExportSettings>) => {
    setSettings((prev) => ({ ...prev, ...changes }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    for (let i = 0; i <= 100; i += 2) {
      await new Promise((r) => setTimeout(r, 50));
      setExportProgress(i);
    }

    onExport?.(settings);
    setIsExporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Exportar Vídeo
          </DialogTitle>
          <DialogDescription>
            Configure as opções de exportação para &quot;{projectName}&quot;
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="py-12 space-y-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="font-medium text-lg">Exportando vídeo...</h3>
              <p className="text-sm text-muted-foreground">
                {exportProgress < 30 && 'Preparando arquivos...'}
                {exportProgress >= 30 && exportProgress < 70 && 'Renderizando frames...'}
                {exportProgress >= 70 && exportProgress < 90 && 'Codificando vídeo...'}
                {exportProgress >= 90 && 'Finalizando...'}
              </p>
            </div>

            <Progress value={exportProgress} className="h-2" />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{exportProgress}% concluído</span>
              <span>~{formatDuration((100 - exportProgress) * 0.5)} restantes</span>
            </div>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="format">
                  <FileVideo className="h-4 w-4 mr-2" />
                  Formato
                </TabsTrigger>
                <TabsTrigger value="quality">
                  <Zap className="h-4 w-4 mr-2" />
                  Qualidade
                </TabsTrigger>
                <TabsTrigger value="content">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Conteúdo
                </TabsTrigger>
                <TabsTrigger value="advanced">
                  <Settings className="h-4 w-4 mr-2" />
                  Avançado
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                <div className="pr-4">
                  <TabsContent value="format" className="space-y-6 mt-0">
                    <div className="space-y-3">
                      <Label>Formato do Arquivo</Label>
                      <FormatSelector value={settings.format} onChange={(f) => updateSettings({ format: f })} />
                    </div>

                    <div className="space-y-3">
                      <Label>Destino</Label>
                      <DestinationSelector
                        value={settings.destination}
                        onChange={(d) => updateSettings({ destination: d })}
                      />
                    </div>

                    {settings.destination === 'youtube' && (
                      <div className="space-y-3 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                        <Label className="flex items-center gap-2">
                          <Youtube className="h-4 w-4 text-red-500" />
                          Configurações do YouTube
                        </Label>
                        <Select
                          value={settings.youtubePrivacy || 'private'}
                          onValueChange={(v) => updateSettings({ youtubePrivacy: v as 'public' | 'unlisted' | 'private' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Privacidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Público</SelectItem>
                            <SelectItem value="unlisted">Não listado</SelectItem>
                            <SelectItem value="private">Privado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="quality" className="space-y-6 mt-0">
                    <div className="space-y-3">
                      <Label>Resolução</Label>
                      <ResolutionSelector
                        value={settings.resolution}
                        onChange={(r) => updateSettings({ resolution: r })}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Qualidade</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {QUALITY_PRESETS.map((preset) => (
                          <Card
                            key={preset.id}
                            className={`cursor-pointer p-3 text-center ${
                              settings.quality === preset.id ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => updateSettings({ quality: preset.id })}
                          >
                            <div className="font-medium text-sm">{preset.label}</div>
                            <div className="text-[10px] text-muted-foreground">{preset.description}</div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="content" className="space-y-6 mt-0">
                    <ContentOptions settings={settings} onChange={updateSettings} />
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-6 mt-0">
                    <AdvancedSettings settings={settings} onChange={updateSettings} />
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            <ExportSummary
              settings={settings}
              duration={projectDuration}
              projectName={projectName}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExport}>
                <Rocket className="h-4 w-4 mr-2" />
                Iniciar Exportação
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ExportModal;
