'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Film,
  Scissors,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Wand2,
  ScanLine,
  Sparkles,
  Check,
  SkipForward,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DetectedScene {
  id: string;
  startTime: number;
  endTime: number;
  thumbnail: string;
  confidence: number;
  selected: boolean;
  label?: string;
}

interface SceneDetectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl?: string;
  videoDuration?: number; // in seconds
  onScenesDetected?: (scenes: DetectedScene[]) => void;
  onApplyScenes?: (scenes: DetectedScene[]) => void;
}

type DetectionStatus = 'idle' | 'analyzing' | 'complete' | 'error';

interface DetectionSettings {
  sensitivity: 'low' | 'medium' | 'high';
  minSceneDuration: number; // seconds
  detectFades: boolean;
  detectCuts: boolean;
  detectMotion: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SETTINGS: DetectionSettings = {
  sensitivity: 'medium',
  minSceneDuration: 2,
  detectFades: true,
  detectCuts: true,
  detectMotion: false,
};

const SENSITIVITY_CONFIG = {
  low: { label: 'Baixa', description: 'Detecta apenas mudanças óbvias', threshold: 0.8 },
  medium: { label: 'Média', description: 'Balanço entre precisão e quantidade', threshold: 0.5 },
  high: { label: 'Alta', description: 'Detecta mudanças sutis', threshold: 0.3 },
};

// ============================================================================
// MOCK DETECTION
// ============================================================================

function generateMockScenes(duration: number, sensitivity: string): DetectedScene[] {
  const numScenes =
    sensitivity === 'low' ? 4 : sensitivity === 'medium' ? 8 : 15;

  const scenes: DetectedScene[] = [];
  const avgSceneDuration = duration / numScenes;

  let currentTime = 0;
  for (let i = 0; i < numScenes; i++) {
    const sceneDuration =
      avgSceneDuration * (0.5 + Math.random());
    const endTime = Math.min(currentTime + sceneDuration, duration);

    scenes.push({
      id: `scene-${i + 1}`,
      startTime: currentTime,
      endTime,
      thumbnail: '',
      confidence: 0.7 + Math.random() * 0.3,
      selected: true,
      label: `Cena ${i + 1}`,
    });

    currentTime = endTime;
    if (currentTime >= duration) break;
  }

  return scenes;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SceneCard({
  scene,
  index,
  onToggle,
  onSelect,
  isSelected,
}: {
  scene: DetectedScene;
  index: number;
  onToggle: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const duration = scene.endTime - scene.startTime;

  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${!scene.selected ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-8 w-8 text-muted-foreground/30" />
        </div>

        {/* Time Badge */}
        <div className="absolute bottom-1 left-1 right-1 flex justify-between">
          <Badge variant="secondary" className="text-[10px] h-5">
            {formatTime(scene.startTime)}
          </Badge>
          <Badge variant="secondary" className="text-[10px] h-5">
            {formatDuration(duration)}
          </Badge>
        </div>

        {/* Confidence */}
        <div className="absolute top-1 right-1">
          <Badge
            variant={scene.confidence > 0.8 ? 'default' : 'outline'}
            className="text-[10px] h-5"
          >
            {Math.round(scene.confidence * 100)}%
          </Badge>
        </div>

        {/* Selection checkbox */}
        <div
          className="absolute top-1 left-1"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              scene.selected
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-background/80 border-muted-foreground'
            }`}
          >
            {scene.selected && <Check className="h-3 w-3" />}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{scene.label || `Cena ${index + 1}`}</p>
      </div>
    </Card>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: DetectionSettings;
  onChange: (settings: DetectionSettings) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Sensitivity */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Sensibilidade</Label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as const).map((level) => {
            const config = SENSITIVITY_CONFIG[level];
            return (
              <Card
                key={level}
                className={`p-2 cursor-pointer text-center transition-all ${
                  settings.sensitivity === level ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => onChange({ ...settings, sensitivity: level })}
              >
                <p className="text-xs font-medium">{config.label}</p>
                <p className="text-[10px] text-muted-foreground">{config.description}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Min Scene Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Duração Mínima da Cena</Label>
          <span className="text-xs text-muted-foreground">{settings.minSceneDuration}s</span>
        </div>
        <Slider
          value={[settings.minSceneDuration]}
          onValueChange={([v]) => onChange({ ...settings, minSceneDuration: v })}
          min={0.5}
          max={10}
          step={0.5}
        />
      </div>

      {/* Detection Types */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Tipos de Detecção</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs">Cortes diretos</p>
              <p className="text-[10px] text-muted-foreground">Mudanças bruscas entre cenas</p>
            </div>
            <Switch
              checked={settings.detectCuts}
              onCheckedChange={(v) => onChange({ ...settings, detectCuts: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs">Fades</p>
              <p className="text-[10px] text-muted-foreground">Transições com fade in/out</p>
            </div>
            <Switch
              checked={settings.detectFades}
              onCheckedChange={(v) => onChange({ ...settings, detectFades: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs">Movimento</p>
              <p className="text-[10px] text-muted-foreground">Mudanças significativas de movimento</p>
            </div>
            <Switch
              checked={settings.detectMotion}
              onCheckedChange={(v) => onChange({ ...settings, detectMotion: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SceneDetectionModal({
  open,
  onOpenChange,
  videoUrl,
  videoDuration = 120,
  onScenesDetected,
  onApplyScenes,
}: SceneDetectionModalProps) {
  const [status, setStatus] = useState<DetectionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState<DetectionSettings>(DEFAULT_SETTINGS);
  const [scenes, setScenes] = useState<DetectedScene[]>([]);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const startDetection = useCallback(async () => {
    setStatus('analyzing');
    setProgress(0);
    setScenes([]);

    // Simulate progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 100));
      setProgress(i);
    }

    // Generate mock scenes
    const detectedScenes = generateMockScenes(videoDuration, settings.sensitivity);
    setScenes(detectedScenes);
    setStatus('complete');
    onScenesDetected?.(detectedScenes);
  }, [videoDuration, settings.sensitivity, onScenesDetected]);

  const toggleSceneSelection = (sceneId: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, selected: !s.selected } : s))
    );
  };

  const selectAllScenes = () => {
    setScenes((prev) => prev.map((s) => ({ ...s, selected: true })));
  };

  const deselectAllScenes = () => {
    setScenes((prev) => prev.map((s) => ({ ...s, selected: false })));
  };

  const handleApply = () => {
    const selectedScenes = scenes.filter((s) => s.selected);
    onApplyScenes?.(selectedScenes);
    onOpenChange(false);
  };

  const selectedCount = scenes.filter((s) => s.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Detecção de Cenas
            <Badge variant="secondary">AI</Badge>
          </DialogTitle>
          <DialogDescription>
            Analise o vídeo e detecte automaticamente pontos de corte entre cenas
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="py-4">
          {status === 'idle' && (
            <div className="space-y-6">
              {/* Video Preview */}
              <Card className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center">
                  <Film className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {videoUrl ? 'Vídeo carregado' : 'Nenhum vídeo selecionado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Duração: {formatDuration(videoDuration)}
                  </p>
                </div>
              </Card>

              {/* Settings Toggle */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showSettings ? 'Ocultar Configurações' : 'Configurações'}
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Tempo estimado: ~{Math.ceil(videoDuration / 60)} min
                </div>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <Card className="p-4">
                  <SettingsPanel settings={settings} onChange={setSettings} />
                </Card>
              )}

              {/* Start Button */}
              <Button className="w-full" onClick={startDetection}>
                <Wand2 className="h-4 w-4 mr-2" />
                Iniciar Detecção de Cenas
              </Button>
            </div>
          )}

          {status === 'analyzing' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <h3 className="font-medium">Analisando vídeo...</h3>
                <p className="text-sm text-muted-foreground">
                  Detectando mudanças de cena com IA
                </p>
              </div>

              <Progress value={progress} className="h-2" />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processando frames...</span>
                <span>{progress}%</span>
              </div>

              {/* Analysis Steps */}
              <div className="space-y-2">
                {[
                  { label: 'Extraindo frames', done: progress > 20 },
                  { label: 'Analisando histograma', done: progress > 40 },
                  { label: 'Detectando cortes', done: progress > 60 },
                  { label: 'Identificando fades', done: progress > 80 },
                  { label: 'Finalizando', done: progress === 100 },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'complete' && (
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{scenes.length} cenas detectadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllScenes}>
                    Selecionar Todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllScenes}>
                    Desmarcar Todas
                  </Button>
                </div>
              </div>

              {/* Scenes Grid */}
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-4 gap-2 p-1">
                  {scenes.map((scene, index) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      index={index}
                      onToggle={() => toggleSceneSelection(scene.id)}
                      onSelect={() => setSelectedSceneIndex(index)}
                      isSelected={selectedSceneIndex === index}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Selection Summary */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedCount} de {scenes.length} cenas selecionadas
                  </span>
                </div>
                <Badge variant={selectedCount > 0 ? 'default' : 'secondary'}>
                  {selectedCount > 0 ? 'Pronto para aplicar' : 'Selecione cenas'}
                </Badge>
              </div>

              {/* Scene Navigation (when scene is selected) */}
              {selectedSceneIndex !== null && scenes[selectedSceneIndex] && (
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={selectedSceneIndex === 0}
                      onClick={() => setSelectedSceneIndex(selectedSceneIndex - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="text-center">
                      <p className="font-medium text-sm">
                        {scenes[selectedSceneIndex].label || `Cena ${selectedSceneIndex + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(scenes[selectedSceneIndex].startTime)} -{' '}
                        {formatTime(scenes[selectedSceneIndex].endTime)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={selectedSceneIndex === scenes.length - 1}
                      onClick={() => setSelectedSceneIndex(selectedSceneIndex + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* Re-analyze Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus('idle');
                    setScenes([]);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Analisar novamente com outras configurações
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="font-medium">Erro na análise</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Não foi possível detectar cenas no vídeo
              </p>
              <Button variant="outline" onClick={() => setStatus('idle')}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {status === 'complete' && (
            <>
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleApply} disabled={selectedCount === 0}>
                <Scissors className="h-4 w-4 mr-2" />
                Aplicar Cortes ({selectedCount})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SceneDetectionModal;
