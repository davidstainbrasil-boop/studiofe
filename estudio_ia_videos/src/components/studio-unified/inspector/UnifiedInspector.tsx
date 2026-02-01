/**
 * 📋 Unified Inspector Panel
 * Painel de inspeção com múltiplas tabs para propriedades, efeitos, animações e IA
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Settings,
  Sparkles,
  Play,
  Palette,
  Move,
  Layers,
  Type,
  Image,
  Video,
  Volume2,
  Clock,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCw,
  ZoomIn,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Wand2,
  RefreshCw,
  Sliders,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnifiedStudioStore } from '@/lib/stores/unified-studio-store';
import { AvatarInspector } from './AvatarInspector';

type InspectorTab = 'properties' | 'effects' | 'animations' | 'ai';

interface SelectedElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'avatar' | 'shape';
  name: string;
  visible: boolean;
  locked: boolean;
  properties: Record<string, unknown>;
}

interface UnifiedInspectorProps {
  className?: string;
}

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  actions,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Properties Tab Content
function PropertiesTab({ element }: { element: SelectedElement | null }) {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <Layers className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Nenhum elemento selecionado</p>
        <p className="text-xs mt-1">Selecione um elemento no canvas ou timeline</p>
      </div>
    );
  }

  const getIcon = () => {
    switch (element.type) {
      case 'text':
        return <Type className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Volume2 className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Element Header */}
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={element.name}
              className="h-7 text-sm font-medium"
              placeholder="Nome do elemento"
            />
            <Badge variant="secondary" className="text-[10px] mt-1">
              {element.type}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {element.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {element.locked ? (
                <Lock className="h-4 w-4 text-yellow-500" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Separator />

      {/* Transform */}
      <Section title="Transformação" icon={Move}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">X</Label>
            <Input type="number" className="h-8 mt-1" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Y</Label>
            <Input type="number" className="h-8 mt-1" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Largura</Label>
            <Input type="number" className="h-8 mt-1" placeholder="100" />
          </div>
          <div>
            <Label className="text-xs">Altura</Label>
            <Input type="number" className="h-8 mt-1" placeholder="100" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <Label className="text-xs">Rotação</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="number" className="h-8 flex-1" placeholder="0" />
              <span className="text-xs text-muted-foreground">°</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Opacidade</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="number" className="h-8 flex-1" placeholder="100" />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </Section>

      <Separator />

      {/* Type-specific properties */}
      {element.type === 'text' && (
        <>
          <Section title="Texto" icon={Type}>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Fonte</Label>
                <Select defaultValue="inter">
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="opensans">Open Sans</SelectItem>
                    <SelectItem value="montserrat">Montserrat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tamanho</Label>
                  <Input type="number" className="h-8 mt-1" placeholder="24" />
                </div>
                <div>
                  <Label className="text-xs">Peso</Label>
                  <Select defaultValue="400">
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light</SelectItem>
                      <SelectItem value="400">Regular</SelectItem>
                      <SelectItem value="500">Medium</SelectItem>
                      <SelectItem value="600">Semibold</SelectItem>
                      <SelectItem value="700">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Alinhamento</Label>
                <div className="flex gap-1 mt-1">
                  <Button variant="outline" size="sm" className="flex-1">
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Cor</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="color" className="h-8 w-12 p-1" defaultValue="#ffffff" />
                  <Input className="h-8 flex-1" placeholder="#ffffff" />
                </div>
              </div>
            </div>
          </Section>
          <Separator />
        </>
      )}

      {/* Blend Mode */}
      <Section title="Mesclagem" icon={Layers} defaultOpen={false}>
        <div>
          <Label className="text-xs">Modo de Mesclagem</Label>
          <Select defaultValue="normal">
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="multiply">Multiplicar</SelectItem>
              <SelectItem value="screen">Tela</SelectItem>
              <SelectItem value="overlay">Sobreposição</SelectItem>
              <SelectItem value="darken">Escurecer</SelectItem>
              <SelectItem value="lighten">Clarear</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>
    </div>
  );
}

// Effects Tab Content
function EffectsTab({ element }: { element: SelectedElement | null }) {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <Sparkles className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Nenhum elemento selecionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Color Correction */}
      <Section title="Correção de Cor" icon={Palette}>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Brilho</Label>
              <span className="text-xs text-muted-foreground">0</span>
            </div>
            <Slider defaultValue={[0]} min={-100} max={100} step={1} className="mt-2" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Contraste</Label>
              <span className="text-xs text-muted-foreground">0</span>
            </div>
            <Slider defaultValue={[0]} min={-100} max={100} step={1} className="mt-2" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Saturação</Label>
              <span className="text-xs text-muted-foreground">0</span>
            </div>
            <Slider defaultValue={[0]} min={-100} max={100} step={1} className="mt-2" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Temperatura</Label>
              <span className="text-xs text-muted-foreground">0</span>
            </div>
            <Slider defaultValue={[0]} min={-100} max={100} step={1} className="mt-2" />
          </div>
        </div>
      </Section>

      <Separator />

      {/* Filters */}
      <Section title="Filtros" icon={Sliders}>
        <div className="grid grid-cols-3 gap-2">
          {['Original', 'Vivid', 'B&W', 'Sepia', 'Cool', 'Warm'].map((filter) => (
            <Card
              key={filter}
              className="p-2 cursor-pointer hover:bg-muted transition-colors text-center"
            >
              <div className="h-8 w-full bg-gradient-to-br from-muted to-muted-foreground/20 rounded mb-1" />
              <span className="text-[10px]">{filter}</span>
            </Card>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Shadow */}
      <Section title="Sombra" icon={Layers} defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Ativar Sombra</Label>
            <Switch />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Desfoque</Label>
              <span className="text-xs text-muted-foreground">10px</span>
            </div>
            <Slider defaultValue={[10]} min={0} max={50} step={1} className="mt-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Offset X</Label>
              <Input type="number" className="h-8 mt-1" placeholder="5" />
            </div>
            <div>
              <Label className="text-xs">Offset Y</Label>
              <Input type="number" className="h-8 mt-1" placeholder="5" />
            </div>
          </div>
        </div>
      </Section>

      {/* Add Effect Button */}
      <Button variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Efeito
      </Button>
    </div>
  );
}

// Animations Tab Content
function AnimationsTab({ element }: { element: SelectedElement | null }) {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <Film className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Nenhum elemento selecionado</p>
      </div>
    );
  }

  const animations = [
    { id: 'fade-in', name: 'Fade In', category: 'entrada' },
    { id: 'slide-up', name: 'Slide Up', category: 'entrada' },
    { id: 'scale-in', name: 'Scale In', category: 'entrada' },
    { id: 'bounce', name: 'Bounce', category: 'entrada' },
    { id: 'fade-out', name: 'Fade Out', category: 'saída' },
    { id: 'slide-down', name: 'Slide Down', category: 'saída' },
  ];

  return (
    <div className="space-y-4">
      {/* Entrance Animations */}
      <Section title="Animação de Entrada" icon={Play}>
        <div className="space-y-3">
          <Select defaultValue="none">
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione uma animação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {animations
                .filter((a) => a.category === 'entrada')
                .map((anim) => (
                  <SelectItem key={anim.id} value={anim.id}>
                    {anim.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Duração</Label>
              <span className="text-xs text-muted-foreground">0.5s</span>
            </div>
            <Slider defaultValue={[500]} min={100} max={2000} step={100} className="mt-2" />
          </div>

          <div>
            <Label className="text-xs">Easing</Label>
            <Select defaultValue="ease-out">
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="ease-in">Ease In</SelectItem>
                <SelectItem value="ease-out">Ease Out</SelectItem>
                <SelectItem value="ease-in-out">Ease In Out</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Separator />

      {/* Exit Animations */}
      <Section title="Animação de Saída" icon={Play}>
        <div className="space-y-3">
          <Select defaultValue="none">
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione uma animação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {animations
                .filter((a) => a.category === 'saída')
                .map((anim) => (
                  <SelectItem key={anim.id} value={anim.id}>
                    {anim.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Duração</Label>
              <span className="text-xs text-muted-foreground">0.5s</span>
            </div>
            <Slider defaultValue={[500]} min={100} max={2000} step={100} className="mt-2" />
          </div>
        </div>
      </Section>

      <Separator />

      {/* Keyframes */}
      <Section title="Keyframes" icon={Clock} defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0:00</span>
            <span>|</span>
            <span>0:15</span>
            <span>|</span>
            <span>0:30</span>
          </div>
          <div className="h-8 bg-muted rounded relative">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full" />
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full" />
          </div>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Keyframe
          </Button>
        </div>
      </Section>

      {/* Preview */}
      <Button variant="outline" className="w-full">
        <Play className="h-4 w-4 mr-2" />
        Preview Animação
      </Button>
    </div>
  );
}

// AI Tab Content
function AITab({ element }: { element: SelectedElement | null }) {
  return (
    <div className="space-y-4">
      {/* AI Enhancements */}
      <Section title="Melhorias com IA" icon={Wand2}>
        <div className="space-y-2">
          <Card className="p-3 cursor-pointer hover:bg-muted transition-colors">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Image className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Melhorar Imagem</p>
                <p className="text-xs text-muted-foreground">
                  Upscale e aprimoramento automático
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted transition-colors">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Remover Fundo</p>
                <p className="text-xs text-muted-foreground">
                  Extração inteligente de sujeito
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted transition-colors">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Palette className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Correção Automática</p>
                <p className="text-xs text-muted-foreground">
                  Ajuste de cor e exposição com IA
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted transition-colors">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Type className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Gerar Texto</p>
                <p className="text-xs text-muted-foreground">
                  Criar copy com base no contexto
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      <Separator />

      {/* AI Suggestions */}
      <Section title="Sugestões da IA" icon={Sparkles}>
        <div className="space-y-2">
          <Card className="p-3 border-dashed">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Dica
              </Badge>
              <p className="text-xs text-muted-foreground">
                O contraste do texto pode ser melhorado para maior legibilidade.
              </p>
            </div>
            <Button variant="link" size="sm" className="h-6 p-0 mt-2 text-xs">
              Aplicar sugestão
            </Button>
          </Card>

          <Card className="p-3 border-dashed">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Dica
              </Badge>
              <p className="text-xs text-muted-foreground">
                Adicionar uma animação de entrada pode melhorar o engajamento.
              </p>
            </div>
            <Button variant="link" size="sm" className="h-6 p-0 mt-2 text-xs">
              Aplicar sugestão
            </Button>
          </Card>
        </div>
      </Section>

      {/* AI Generate */}
      <Button className="w-full">
        <Wand2 className="h-4 w-4 mr-2" />
        Analisar com IA
      </Button>
    </div>
  );
}

export function UnifiedInspector({ className }: UnifiedInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('properties');

  const { selectedElementIds, canvasElements } = useUnifiedStudioStore((state) => ({
    selectedElementIds: state.selectedElementIds,
    canvasElements: state.canvasElements,
  }));

  // Get first selected element (for now, single selection)
  const selectedElement: SelectedElement | null = useMemo(() => {
    if (selectedElementIds.length === 0) return null;
    
    // Mock element for demo
    return {
      id: selectedElementIds[0],
      type: 'text',
      name: 'Título Principal',
      visible: true,
      locked: false,
      properties: {},
    };
  }, [selectedElementIds]);

  // Check if selected element is avatar
  const isAvatar = selectedElement?.type === 'avatar';

  return (
    <div className={cn('flex flex-col h-full bg-background border-l', className)}>
      {/* Header */}
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Inspector</h3>
        {selectedElement && (
          <p className="text-xs text-muted-foreground mt-1">
            {selectedElementIds.length} elemento(s) selecionado(s)
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as InspectorTab)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="grid grid-cols-4 mx-3 mt-2 h-8">
          <TabsTrigger value="properties" className="text-xs px-2">
            <Settings className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Props</span>
          </TabsTrigger>
          <TabsTrigger value="effects" className="text-xs px-2">
            <Sparkles className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Effects</span>
          </TabsTrigger>
          <TabsTrigger value="animations" className="text-xs px-2">
            <Play className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Anim</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs px-2">
            <Wand2 className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="properties" className="m-0 p-3">
            {isAvatar ? (
              <AvatarInspector
                config={{
                  avatarId: selectedElement!.id,
                  avatarName: selectedElement!.name,
                  avatarType: 'realistic',
                  voice: {
                    id: 'voice-1',
                    name: 'Ana',
                    language: 'pt-BR',
                    speed: 1,
                    pitch: 0,
                    volume: 100,
                  },
                  expression: {
                    current: 'neutral',
                    intensity: 50,
                    autoDetect: true,
                  },
                  position: {
                    x: 0,
                    y: 0,
                    scale: 100,
                    rotation: 0,
                  },
                  visible: true,
                  locked: false,
                  quality: 'high',
                }}
                onConfigChange={() => {}}
              />
            ) : (
              <PropertiesTab element={selectedElement} />
            )}
          </TabsContent>

          <TabsContent value="effects" className="m-0 p-3">
            <EffectsTab element={selectedElement} />
          </TabsContent>

          <TabsContent value="animations" className="m-0 p-3">
            <AnimationsTab element={selectedElement} />
          </TabsContent>

          <TabsContent value="ai" className="m-0 p-3">
            <AITab element={selectedElement} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default UnifiedInspector;
