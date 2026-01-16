
'use client';

import React, { useState, useRef } from 'react';
import { RealisticAvatarRenderer, AvatarCustomizationConfig, RealisticAvatarRendererRef } from './RealisticAvatarRenderer';
import { FacialCapture, FaceBlendShapes } from './FacialCapture';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Maximize2, Settings2, Zap, Download, Palette, User, Mic } from 'lucide-react';
import { VoiceSelector } from '../../studio-unified/VoiceSelector';
import { Textarea } from '@/components/ui/textarea';

interface RealisticAvatarSystemProps {
  isStudioMode?: boolean;
  onConfirm?: (renderConfig: any) => void;
  onCancel?: () => void;
  initialAvatarId?: string;
  initialAvatarName?: string;
}

export default function RealisticAvatarSystem({
  isStudioMode = false,
  onConfirm,
  onCancel,
  initialAvatarId,
  initialAvatarName
}: RealisticAvatarSystemProps) {
  const [blendShapes, setBlendShapes] = useState<FaceBlendShapes>({
    jawOpen: 0, mouthSmileLeft: 0, mouthSmileRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0,
    eyeBlinkLeft: 0, eyeBlinkRight: 0, browInnerUp: 0, browOuterUpLeft: 0, browOuterUpRight: 0,
    headYaw: 0, headPitch: 0, headRoll: 0
  });

  const [isCaptureActive, setIsCaptureActive] = useState(false);
  const [lightingPreset, setLightingPreset] = useState<'studio' | 'city' | 'sunset' | 'night'>('studio');
  const [quality, setQuality] = useState<'medium' | 'high' | 'ultra'>('high');
  const [showPhysicsDebug, setShowPhysicsDebug] = useState(false);

  const [avatarConfig, setAvatarConfig] = useState<AvatarCustomizationConfig>({
    skinColor: '#e0ac69',
    eyeColor: '#3b82f6',
    hairColor: '#1e293b',
    roughness: 0.4,
    metalness: 0.0,
    scale: 1.0
  });

  const [text, setText] = useState('Olá! Este é um avatar hiper-realista gerado com IA.');
  const [voiceId, setVoiceId] = useState('');

  const rendererRef = useRef<RealisticAvatarRendererRef>(null);

  const handleExport = () => {
    if (rendererRef.current) {
      const screenshot = rendererRef.current.captureScreenshot();

      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.href = screenshot;
      link.download = `avatar-export-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Also log the config for reference (in a real app, this could be a JSON download)
      console.log('Exporting Avatar Config:', avatarConfig);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(avatarConfig, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `avatar-config-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Main Viewport */}
      <div className="flex-1 relative flex flex-col">
        {!isStudioMode && (
          <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold shadow-lg shadow-violet-900/20">
                AV
              </div>
              <h1 className="font-bold text-lg tracking-tight">
                Avatar Realista <span className="text-violet-400 font-light">Pro</span>
              </h1>
              <Badge variant="outline" className="ml-2 border-violet-500/30 text-violet-300 bg-violet-500/10">
                v2.1
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-slate-400">FPS:</span>
                <span className="font-mono text-emerald-400">60</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Render:</span>
                <span className="font-medium text-white">{quality.toUpperCase()}</span>
              </div>
            </div>
          </header>
        )}

        <div className="flex-1 relative bg-black/50">
          <RealisticAvatarRenderer
            ref={rendererRef}
            blendShapes={blendShapes}
            lightingPreset={lightingPreset}
            quality={quality}
            config={avatarConfig}
          />

          {/* Overlay UI */}
          <div className="absolute top-6 right-6 w-80 space-y-4">
            <FacialCapture
              isActive={isCaptureActive}
              onToggle={setIsCaptureActive}
              onBlendShapesUpdate={setBlendShapes}
            />
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-800 pointer-events-auto space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status do Sistema</p>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Physics Engine: Ativo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  PBR Lighting: {lightingPreset}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <Tabs defaultValue="customize" className="w-full">
            <TabsList className="w-full bg-slate-800">
              <TabsTrigger value="customize" className="flex-1">
                <User className="w-4 h-4 mr-2" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex-1">
                <Mic className="w-4 h-4 mr-2" />
                Voz
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                <Settings2 className="w-4 h-4 mr-2" />
                Ajustes
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 space-y-6">
              <TabsContent value="voice" className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Roteiro & Voz</Label>

                  <div className="space-y-2">
                    <Label>Texto do Avatar</Label>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="bg-slate-950 border-slate-700 min-h-[100px] text-sm"
                      placeholder="Digite o que o avatar deve falar..."
                    />
                  </div>

                  <div className="space-y-2">
                    <VoiceSelector
                      value={voiceId}
                      onChange={setVoiceId}
                      label="Voz Neural"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="customize" className="space-y-6">
                {/* Material Colors */}
                <div className="space-y-4">
                  <Label className="text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Materiais
                  </Label>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Pele</Label>
                      <span className="text-slate-500 font-mono text-xs">{avatarConfig.skinColor}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={avatarConfig.skinColor}
                        onChange={(e) => setAvatarConfig(prev => ({ ...prev, skinColor: e.target.value }))}
                        className="h-8 w-full bg-transparent rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Olhos</Label>
                      <span className="text-slate-500 font-mono text-xs">{avatarConfig.eyeColor}</span>
                    </div>
                    <input
                      type="color"
                      value={avatarConfig.eyeColor}
                      onChange={(e) => setAvatarConfig(prev => ({ ...prev, eyeColor: e.target.value }))}
                      className="h-8 w-full bg-transparent rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Roupa/Cabelo</Label>
                      <span className="text-slate-500 font-mono text-xs">{avatarConfig.hairColor}</span>
                    </div>
                    <input
                      type="color"
                      value={avatarConfig.hairColor}
                      onChange={(e) => setAvatarConfig(prev => ({ ...prev, hairColor: e.target.value }))}
                      className="h-8 w-full bg-transparent rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Physical Properties */}
                <div className="space-y-4">
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Propriedades Físicas</Label>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <Label>Roughness (Aspereza)</Label>
                      <span className="text-slate-400">{Math.round(avatarConfig.roughness * 100)}%</span>
                    </div>
                    <Slider
                      value={[avatarConfig.roughness]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={([val]) => setAvatarConfig(prev => ({ ...prev, roughness: val }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <Label>Metalness (Metalicidade)</Label>
                      <span className="text-slate-400">{Math.round(avatarConfig.metalness * 100)}%</span>
                    </div>
                    <Slider
                      value={[avatarConfig.metalness]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={([val]) => setAvatarConfig(prev => ({ ...prev, metalness: val }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <Label>Escala</Label>
                      <span className="text-slate-400">{avatarConfig.scale.toFixed(2)}x</span>
                    </div>
                    <Slider
                      value={[avatarConfig.scale]}
                      min={0.5}
                      max={2}
                      step={0.1}
                      onValueChange={([val]) => setAvatarConfig(prev => ({ ...prev, scale: val }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                {/* Environment Section */}
                <div className="space-y-3">
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Ambiente & Luz</Label>
                  <div className="grid gap-2">
                    <Label htmlFor="lighting">Preset de Iluminação</Label>
                    <Select value={lightingPreset} onValueChange={(v: any) => setLightingPreset(v)}>
                      <SelectTrigger id="lighting" className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                        <SelectItem value="studio">Estúdio Profissional</SelectItem>
                        <SelectItem value="city">Cidade (Dia)</SelectItem>
                        <SelectItem value="sunset">Pôr do Sol</SelectItem>
                        <SelectItem value="night">Noturno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Quality Section */}
                <div className="space-y-3">
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Qualidade de Renderização</Label>
                  <div className="grid gap-2">
                    <Label>Nível de Detalhe</Label>
                    <Tabs defaultValue="high" value={quality} onValueChange={(v: any) => setQuality(v)} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                        <TabsTrigger value="medium">Médio</TabsTrigger>
                        <TabsTrigger value="high">Alto</TabsTrigger>
                        <TabsTrigger value="ultra">Ultra</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <p className="text-xs text-slate-500">
                      Ultra habilita sombras suaves e amostragem 2x. Requer GPU dedicada.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Physics Debug */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Physics Debug</Label>
                    <p className="text-xs text-slate-500">Visualizar vetores de movimento</p>
                  </div>
                  <Switch checked={showPhysicsDebug} onCheckedChange={setShowPhysicsDebug} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-2">
          {isStudioMode ? (
            <>
              <Button
                onClick={() => onConfirm?.({ ...avatarConfig, blendShapes, lightingPreset, quality, text, voiceId })}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                Gerar Clipe
              </Button>
              <Button onClick={onCancel} variant="ghost" className="w-full text-slate-400 hover:text-white">
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleExport} className="w-full bg-violet-600 hover:bg-violet-700">
                <Download className="w-4 h-4 mr-2" />
                Exportar Imagem
              </Button>
              <Button onClick={handleExportJSON} variant="outline" className="w-full border-slate-700 hover:bg-slate-800">
                Exportar JSON
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
