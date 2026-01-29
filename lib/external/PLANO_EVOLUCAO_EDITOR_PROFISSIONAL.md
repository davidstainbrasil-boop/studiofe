# 🎬 Plano de Evolução do Editor de Vídeo Profissional

> **Projeto:** Estúdio IA Vídeos
> **Documento:** Roadmap de Bibliotecas e Implementação
> **Data:** 15 de Outubro de 2025
> **Status:** Planejamento Estratégico

---

## 📋 Índice

1. [Contexto e Visão Geral](#contexto-e-visão-geral)
2. [Análise do Estado Atual](#análise-do-estado-atual)
3. [Fase 1: Estabilização do MVP](#fase-1-estabilização-do-mvp)
4. [Fase 2: Editor Profissional](#fase-2-editor-profissional)
5. [Fase 3: Recursos Avançados](#fase-3-recursos-avançados)
6. [Fase 4: Otimização e Escala](#fase-4-otimização-e-escala)
7. [Bibliotecas Avaliadas](#bibliotecas-avaliadas)
8. [Decisões Técnicas](#decisões-técnicas)
9. [Cronograma e Estimativas](#cronograma-e-estimativas)

---

## 🎯 Contexto e Visão Geral

### Objetivo Estratégico

Transformar o editor básico de slides em um **editor de vídeo profissional** com recursos de motion graphics, timeline multi-track, keyframing e efeitos avançados, mantendo a estabilidade e performance do sistema.

### Princípios Orientadores

1. **Evolução Incremental** - Não comprometer o MVP com features prematuras
2. **Reuso de Investimento** - Maximizar uso das bibliotecas já instaladas
3. **Open Source First** - Priorizar soluções open source maduras
4. **Performance** - Manter tempo de build e bundle size sob controle
5. **Developer Experience** - Código limpo, testável e manutenível

---

## 📊 Análise do Estado Atual

### Bibliotecas Já Instaladas (package.json)

#### ✅ Renderização e Vídeo
```json
"@remotion/bundler": "^4.0.358",
"@remotion/cli": "^4.0.358",
"@remotion/lambda": "^4.0.358",
"@remotion/player": "^4.0.358",
"@remotion/renderer": "^4.0.358",
"remotion": "^4.0.195"
```
**Status:** ATIVO | **Uso:** 90% | **Ação:** Manter e expandir

#### ✅ Canvas e Manipulação Gráfica
```json
"fabric": "^6.7.1",
"canvas": "^3.2.0",
"html2canvas": "^1.4.1"
```
**Status:** ATIVO | **Uso:** 40% | **Ação:** Expandir funcionalidades

#### ✅ Animações
```json
"gsap": "^3.13.0",
"framer-motion": "^11.18.2"
```
**Status:** ATIVO | **Uso:** 30% | **Ação:** Implementar keyframe system

#### ✅ Gráficos 3D
```json
"@react-three/fiber": "^9.3.0",
"@react-three/drei": "^10.7.6",
"three": "^0.169.0"
```
**Status:** ARQUIVADO (MVP) | **Uso:** 0% | **Ação:** Fase 3+

#### ✅ Drag and Drop
```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^8.0.0",
"@hello-pangea/dnd": "^18.0.1"
```
**Status:** ATIVO | **Uso:** 60% | **Ação:** Usar em timeline

#### ✅ Processamento de Vídeo
```json
"@ffmpeg/ffmpeg": "^0.12.15",
"@ffmpeg/core": "^0.12.10",
"fluent-ffmpeg": "^2.1.3"
```
**Status:** ATIVO | **Uso:** 70% | **Ação:** Manter

### Capacidade Atual vs. Desejada

| Recurso | Atual | Desejado | Gap |
|---------|-------|----------|-----|
| Timeline básica | ✅ 70% | Timeline multi-track | 30% |
| Edição de slides | ✅ 80% | Editor canvas completo | 20% |
| Preview estático | ✅ 90% | Preview tempo real | 10% |
| Keyframes | ❌ 0% | Sistema keyframe visual | 100% |
| Efeitos/Transições | ❌ 0% | Biblioteca de efeitos | 100% |
| Máscaras | ❌ 0% | Mascaramento avançado | 100% |
| Waveforms | ❌ 0% | Visualização áudio | 100% |
| Colaboração | ❌ 0% | Edição colaborativa | 100% |

---

## 🔧 Fase 1: Estabilização do MVP

> **Duração:** 2 semanas
> **Prioridade:** CRÍTICA
> **Objetivo:** Fazer o fluxo básico funcionar de ponta a ponta

### Escopo

Conforme [MVP_SCOPE_LOCK.md](../docs/recovery/MVP_SCOPE_LOCK.md):

- Upload de PPTX → Extração de slides
- Editor básico: título, duração, ordem
- Render: Remotion + FFmpeg → MP4
- Dashboard: listagem e download

### Bibliotecas Necessárias

**NENHUMA NOVA** - Usar somente o que já está instalado.

### Tarefas

#### 1.1 Autenticação
- [x] NextAuth configurado e testado
- [x] Supabase RLS policies ativas
- [x] Flow de login/logout funcionando

#### 1.2 Upload e Processamento
- [x] Upload PPTX para Supabase Storage
- [x] Parser PPTX extrai slides
- [x] Criação de projeto + slides no DB

#### 1.3 Editor Básico
- [x] Rota `/editor?projectId=...` funcionando
- [x] Listagem de slides
- [x] Edição de título e duração
- [x] Reordenação (drag-and-drop)
- [x] Salvamento persistente

#### 1.4 Render Pipeline
- [x] BullMQ configurado (Upstash Redis)
- [x] Worker de render funcional
- [x] Composição Remotion correta
- [x] Export MP4 para Storage
- [x] Notificação de conclusão

#### 1.5 Dashboard
- [x] Listagem de projetos
- [x] Status do render
- [x] Download do vídeo final

### Critérios de Sucesso

✅ Usuário consegue:
1. Fazer login
2. Fazer upload de PPTX
3. Editar slides básicos
4. Iniciar render
5. Baixar vídeo MP4

### Riscos

| Risco | Mitigação |
|-------|-----------|
| BullMQ/Redis instável | Setup Upstash com retry automático |
| Remotion render timeout | Limitar vídeos a 5min no MVP |
| Supabase limits | Monitorar quotas |

---

## 🎨 Fase 2: Editor Profissional

> **Duração:** 3-4 semanas
> **Prioridade:** ALTA
> **Objetivo:** Editor visual de qualidade profissional

### Visão Geral

Transformar o editor básico em uma interface tipo **CapCut/Canva** com:
- Timeline multi-track visual
- Canvas editor com Fabric.js expandido
- Sistema de keyframes
- Preview em tempo real

### Arquitetura Proposta

```
app/components/video-studio/
├── VideoStudio.tsx              # Container principal
├── toolbar/
│   ├── MainToolbar.tsx          # Play, Export, Settings
│   └── EditingTools.tsx         # Text, Shape, Image, etc
├── canvas/
│   ├── CanvasEditor.tsx         # Fabric.js editor
│   ├── LayersPanel.tsx          # Gerenciador de camadas
│   ├── PropertiesPanel.tsx      # Propriedades do elemento
│   └── TransformControls.tsx    # Resize, rotate, etc
├── timeline/
│   ├── TimelineEditor.tsx       # Timeline principal
│   ├── TimelineTrack.tsx        # Track individual
│   ├── TimelineElement.tsx      # Elemento na track
│   ├── TimelineRuler.tsx        # Régua de tempo
│   ├── Playhead.tsx             # Marcador de posição
│   └── KeyframeMarker.tsx       # Marcadores de keyframe
├── preview/
│   ├── PreviewPanel.tsx         # Preview principal
│   ├── RemotionPlayer.tsx       # Player do Remotion
│   └── PreviewControls.tsx      # Controles de playback
└── panels/
    ├── AssetsPanel.tsx          # Biblioteca de assets
    ├── EffectsPanel.tsx         # Efeitos e transições
    └── TemplatesPanel.tsx       # Templates prontos
```

### Bibliotecas a Adicionar

#### 2.1 Referência de Código (Estudo)
```bash
# Clonar para estudo de arquitetura (NÃO adicionar como dependência)
git clone https://github.com/designcombo/react-video-editor ~/temp/designcombo-reference
```

**Objetivo:** Estudar implementação de timeline e UI/UX decisions

#### 2.2 Theatre.js (Animações Cinematográficas)
```bash
npm install @theatre/core @theatre/studio
```

**Por quê:**
- Sistema de keyframes visual profissional
- Editor de curvas de easing
- Timeline não-linear
- Usada em produções profissionais

**Tamanho:** ~200KB (minified)
**Licença:** Apache 2.0

**Exemplo de uso:**
```typescript
import { getProject, types } from '@theatre/core';

const project = getProject('MyVideo');
const sheet = project.sheet('Scene1');

const obj = sheet.object('Box', {
  position: types.compound({
    x: types.number(0, { range: [0, 1920] }),
    y: types.number(0, { range: [0, 1080] })
  }),
  opacity: types.number(1, { range: [0, 1] })
});

// Animar
obj.onValuesChange((values) => {
  element.style.transform = `translate(${values.position.x}px, ${values.position.y}px)`;
  element.style.opacity = values.opacity;
});
```

#### 2.3 Wavesurfer.js (Visualização de Áudio)
```bash
npm install wavesurfer.js
```

**Por quê:**
- Waveforms visuais profissionais
- Sincronização áudio/vídeo
- Marcadores de tempo
- Zoom e navegação

**Tamanho:** ~50KB (minified)
**Licença:** BSD-3-Clause

**Exemplo:**
```typescript
import WaveSurfer from 'wavesurfer.js';

const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#4F4A85',
  progressColor: '#383351',
  height: 64
});

wavesurfer.load('audio.mp3');
```

#### 2.4 React Color (Color Picker)
```bash
npm install react-color
```

**Por quê:**
- Color picker profissional
- Suporte a gradientes
- Paletas personalizadas

**Tamanho:** ~80KB

### Implementação - Sprint 1 (Semana 1)

#### Canvas Editor Expandido

**Objetivo:** Editor visual completo com Fabric.js

**Funcionalidades:**
- [x] Adicionar texto (múltiplas fontes)
- [x] Adicionar formas (retângulos, círculos, polígonos)
- [x] Adicionar imagens (upload + biblioteca)
- [x] Transformações (mover, escalar, rotacionar)
- [x] Camadas (z-index, show/hide, lock)
- [x] Agrupamento de elementos
- [x] Alinhamento (left, center, right, top, middle, bottom)
- [x] Distribuição (horizontal, vertical)

**Código base:**
```typescript
// app/components/video-studio/canvas/CanvasEditor.tsx
'use client';

import { Canvas, FabricObject, IText, Rect, Circle } from 'fabric';
import { useEffect, useRef, useState } from 'react';

export function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      width: 1920,
      height: 1080,
      backgroundColor: '#000000'
    });

    // Event listeners
    fabricCanvas.on('selection:created', (e) => {
      setSelectedObject(e.selected[0]);
    });

    fabricCanvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected[0]);
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  const addText = () => {
    if (!canvas) return;

    const text = new IText('Digite aqui...', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 60,
      fill: '#ffffff'
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addRectangle = () => {
    if (!canvas) return;

    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 150,
      fill: '#3b82f6'
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const deleteSelected = () => {
    if (!canvas || !selectedObject) return;

    canvas.remove(selectedObject);
    canvas.renderAll();
  };

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-16 bg-gray-800 flex flex-col items-center gap-2 p-2">
        <button onClick={addText} className="btn-tool">T</button>
        <button onClick={addRectangle} className="btn-tool">□</button>
        <button onClick={deleteSelected} className="btn-tool">🗑</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <canvas ref={canvasRef} />
      </div>

      {/* Properties Panel */}
      {selectedObject && (
        <PropertiesPanel object={selectedObject} canvas={canvas} />
      )}
    </div>
  );
}
```

### Implementação - Sprint 2 (Semana 2)

#### Timeline Multi-Track

**Objetivo:** Timeline visual profissional inspirada em DesignCombo

**Estrutura de dados:**
```typescript
// app/lib/timeline/types.ts
export interface TimelineProject {
  id: string;
  duration: number; // em segundos
  fps: number;
  tracks: TimelineTrack[];
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'shape';
  name: string;
  locked: boolean;
  visible: boolean;
  elements: TimelineElement[];
}

export interface TimelineElement {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  properties: ElementProperties;
  keyframes: Keyframe[];
}

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: any;
  easing: EasingFunction;
}

export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic';

export interface ElementProperties {
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  opacity?: number;
  [key: string]: any;
}
```

**Componente principal:**
```typescript
// app/components/video-studio/timeline/TimelineEditor.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import type { TimelineProject, TimelineTrack } from '@/app/lib/timeline/types';

export function TimelineEditor({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<TimelineProject | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  // Carregar projeto
  useEffect(() => {
    loadTimelineProject(projectId).then(setProject);
  }, [projectId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Lógica de reposicionamento de elementos
    updateElementPosition(active.id as string, {
      trackId: over.id as string,
      startTime: calculateTimeFromPosition(event.delta.x, zoom)
    });
  };

  const addTrack = (type: TimelineTrack['type']) => {
    if (!project) return;

    const newTrack: TimelineTrack = {
      id: generateId(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${project.tracks.length + 1}`,
      locked: false,
      visible: true,
      elements: []
    };

    setProject({
      ...project,
      tracks: [...project.tracks, newTrack]
    });
  };

  return (
    <div className="h-80 bg-gray-800 border-t border-gray-700">
      {/* Toolbar */}
      <div className="h-10 bg-gray-900 flex items-center gap-2 px-4">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={() => addTrack('video')}>+ Video</button>
        <button onClick={() => addTrack('audio')}>+ Audio</button>
        <button onClick={() => addTrack('text')}>+ Text</button>

        <div className="flex-1" />

        <button onClick={() => setZoom(zoom * 1.2)}>+</button>
        <span className="text-sm text-gray-400">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(zoom / 1.2)}>-</button>
      </div>

      {/* Timeline Content */}
      <DndContext onDragEnd={handleDragEnd}>
        <div ref={timelineRef} className="flex">
          {/* Track Headers */}
          <div className="w-40 bg-gray-900">
            {project?.tracks.map(track => (
              <TrackHeader key={track.id} track={track} />
            ))}
          </div>

          {/* Timeline Grid */}
          <div className="flex-1 relative overflow-x-auto">
            <TimelineRuler
              duration={project?.duration || 0}
              zoom={zoom}
            />

            {project?.tracks.map(track => (
              <TimelineTrack
                key={track.id}
                track={track}
                zoom={zoom}
              />
            ))}

            {/* Playhead */}
            <Playhead
              currentTime={currentTime}
              zoom={zoom}
            />
          </div>
        </div>
      </DndContext>
    </div>
  );
}
```

### Implementação - Sprint 3 (Semana 3)

#### Sistema de Keyframes com Theatre.js

**Objetivo:** Sistema visual de keyframes para animações

```typescript
// app/lib/animation/keyframe-engine.ts
import { getProject, types } from '@theatre/core';
import studio from '@theatre/studio';

export class KeyframeEngine {
  private project: any;
  private sheet: any;
  private objects: Map<string, any>;

  constructor(projectName: string) {
    this.project = getProject(projectName);
    this.sheet = this.project.sheet('Main');
    this.objects = new Map();

    // Inicializar studio em dev
    if (process.env.NODE_ENV === 'development') {
      studio.initialize();
    }
  }

  registerElement(elementId: string, properties: Record<string, any>) {
    const config: Record<string, any> = {};

    // Converter propriedades para types do Theatre.js
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'number') {
        config[key] = types.number(value);
      } else if (key === 'position') {
        config[key] = types.compound({
          x: types.number(value.x, { range: [0, 1920] }),
          y: types.number(value.y, { range: [0, 1080] })
        });
      } else if (key === 'scale') {
        config[key] = types.compound({
          x: types.number(value.x, { range: [0, 10] }),
          y: types.number(value.y, { range: [0, 10] })
        });
      } else if (key === 'rotation') {
        config[key] = types.number(value, { range: [0, 360] });
      } else if (key === 'opacity') {
        config[key] = types.number(value, { range: [0, 1] });
      }
    }

    const obj = this.sheet.object(elementId, config);
    this.objects.set(elementId, obj);

    return obj;
  }

  animate(elementId: string, callback: (values: any) => void) {
    const obj = this.objects.get(elementId);
    if (!obj) return;

    return obj.onValuesChange(callback);
  }

  play() {
    this.sheet.sequence.play();
  }

  pause() {
    this.sheet.sequence.pause();
  }

  seek(time: number) {
    this.sheet.sequence.position = time;
  }

  export() {
    return this.project.export();
  }

  import(state: any) {
    this.project.setProjectState(state);
  }
}
```

**Integração com Canvas:**
```typescript
// app/components/video-studio/canvas/AnimatedCanvas.tsx
'use client';

import { Canvas, FabricObject } from 'fabric';
import { useEffect, useRef } from 'react';
import { KeyframeEngine } from '@/app/lib/animation/keyframe-engine';

export function AnimatedCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<KeyframeEngine>(new KeyframeEngine('VideoProject'));

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 1920,
      height: 1080
    });

    // Exemplo: adicionar objeto animado
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 150,
      fill: '#3b82f6'
    });

    canvas.add(rect);

    // Registrar no keyframe engine
    const theatreObj = engine.current.registerElement('rect-1', {
      position: { x: 100, y: 100 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      opacity: 1
    });

    // Animar
    engine.current.animate('rect-1', (values) => {
      rect.set({
        left: values.position.x,
        top: values.position.y,
        scaleX: values.scale.x,
        scaleY: values.scale.y,
        angle: values.rotation,
        opacity: values.opacity
      });
      canvas.renderAll();
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} />
      <div className="controls">
        <button onClick={() => engine.current.play()}>Play</button>
        <button onClick={() => engine.current.pause()}>Pause</button>
      </div>
    </div>
  );
}
```

### Implementação - Sprint 4 (Semana 4)

#### Preview em Tempo Real + Integração Remotion

**Objetivo:** Preview sincronizado com Remotion Player

```typescript
// app/components/video-studio/preview/RemotionPreview.tsx
'use client';

import { Player } from '@remotion/player';
import { useEffect, useState } from 'react';
import type { TimelineProject } from '@/app/lib/timeline/types';

export function RemotionPreview({
  project,
  currentTime
}: {
  project: TimelineProject;
  currentTime: number;
}) {
  const [composition, setComposition] = useState<any>(null);

  useEffect(() => {
    // Converter timeline para composição Remotion
    const comp = generateRemotionComposition(project);
    setComposition(comp);
  }, [project]);

  if (!composition) return <div>Loading...</div>;

  return (
    <div className="aspect-video bg-black">
      <Player
        component={composition.component}
        durationInFrames={composition.durationInFrames}
        fps={project.fps}
        compositionWidth={1920}
        compositionHeight={1080}
        style={{ width: '100%', height: '100%' }}
        controls
        currentFrame={Math.round(currentTime * project.fps)}
        inputProps={composition.props}
      />
    </div>
  );
}

// Gerador de composição
function generateRemotionComposition(project: TimelineProject) {
  const durationInFrames = Math.round(project.duration * project.fps);

  const Component = () => {
    return (
      <AbsoluteFill style={{ backgroundColor: 'black' }}>
        {project.tracks.map(track => (
          <TrackRenderer key={track.id} track={track} fps={project.fps} />
        ))}
      </AbsoluteFill>
    );
  };

  return {
    component: Component,
    durationInFrames,
    props: { project }
  };
}
```

### Critérios de Sucesso - Fase 2

✅ Editor possui:
1. Canvas editor funcional com Fabric.js
2. Timeline multi-track visual
3. Sistema de keyframes básico
4. Preview em tempo real com Remotion
5. Painel de propriedades
6. Biblioteca de assets básica

### Métricas de Qualidade

- **Performance:** Canvas renderiza a 60 FPS
- **Bundle Size:** Adiciona máximo +500KB ao bundle
- **UX:** Latência < 100ms em interações
- **Testes:** 80%+ cobertura nos componentes críticos

---

## 🚀 Fase 3: Recursos Avançados

> **Duração:** 4-6 semanas
> **Prioridade:** MÉDIA
> **Objetivo:** Recursos profissionais avançados

### Escopo

#### 3.1 Efeitos e Transições

**Bibliotecas:**
```bash
npm install @remotion/transitions
npm install lottie-react
```

**Recursos:**
- Biblioteca de transições (fade, slide, wipe, etc)
- Efeitos visuais (blur, glow, shadow)
- Filtros de cor (brightness, contrast, saturação)
- Animações Lottie

#### 3.2 Mascaramento Avançado

**Usando Fabric.js:**
- Máscaras de forma (circle, polygon)
- Máscaras de texto
- Máscaras animadas
- Clipping paths

**Exemplo:**
```typescript
const mask = new fabric.Circle({
  radius: 100,
  left: 100,
  top: 100
});

const image = new fabric.Image(imgElement, {
  clipPath: mask
});
```

#### 3.3 Waveforms e Sincronização de Áudio

**Wavesurfer.js já adicionado na Fase 2**

**Recursos:**
- Waveform visual na timeline
- Marcadores de beat automáticos
- Sincronização lip-sync (futuro)
- Multi-track audio mixer

**Implementação:**
```typescript
// app/components/timeline/AudioWaveform.tsx
'use client';

import WaveSurfer from 'wavesurfer.js';
import { useEffect, useRef } from 'react';

export function AudioWaveform({
  audioUrl,
  trackId
}: {
  audioUrl: string;
  trackId: string;
}) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!waveformRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4F4A85',
      progressColor: '#383351',
      height: 64,
      barWidth: 2,
      barGap: 1,
      responsive: true,
      normalize: true
    });

    wavesurfer.current.load(audioUrl);

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  return (
    <div
      ref={waveformRef}
      className="w-full h-16 bg-gray-900"
    />
  );
}
```

#### 3.4 Templates e Presets

**Sistema de templates:**
```typescript
// app/lib/templates/types.ts
export interface VideoTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  duration: number;
  tracks: TimelineTrack[];
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'image' | 'color' | 'video';
  defaultValue: any;
  description: string;
}

// Exemplos:
const templates: VideoTemplate[] = [
  {
    id: 'intro-tech',
    name: 'Tech Intro',
    category: 'Intros',
    duration: 10,
    variables: [
      { id: 'company-name', name: 'Nome da Empresa', type: 'text', defaultValue: 'Tech Co.' },
      { id: 'logo', name: 'Logo', type: 'image', defaultValue: null }
    ],
    tracks: [...]
  }
];
```

#### 3.5 Export Avançado

**Formatos e opções:**
- MP4 (múltiplas resoluções: 720p, 1080p, 4K)
- WebM (para web)
- GIF animado
- Frames individuais (PNG sequence)
- Export apenas áudio (MP3/WAV)

**Configurações:**
```typescript
export interface ExportConfig {
  format: 'mp4' | 'webm' | 'gif' | 'frames' | 'audio';
  resolution: '480p' | '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  codec: 'h264' | 'h265' | 'vp9';
  bitrate?: number;
}
```

### Bibliotecas Adicionais - Fase 3

```bash
# Transições avançadas
npm install @remotion/transitions

# Animações Lottie
npm install lottie-react

# Color manipulation
npm install color-thief-react chroma-js

# Export de GIF
npm install gifencoder
```

---

## ⚡ Fase 4: Otimização e Escala

> **Duração:** 2-3 semanas
> **Prioridade:** BAIXA (após Fase 3)
> **Objetivo:** Performance e escalabilidade

### Escopo

#### 4.1 Performance

**Otimizações:**
- Virtualização de timeline (react-window)
- Web Workers para processamento pesado
- Lazy loading de assets
- Caching inteligente
- Debounce/throttle em operações

**Bibliotecas:**
```bash
npm install @virtuoso/react-virtuoso
npm install comlink  # Web Workers com TypeScript
```

#### 4.2 Colaboração em Tempo Real

**Socket.io já instalado**

**Recursos:**
- Edição simultânea (CRDT)
- Cursors de outros usuários
- Chat integrado
- Histórico de mudanças

**Bibliotecas:**
```bash
npm install yjs  # CRDT para colaboração
npm install y-websocket
```

#### 4.3 Cloud Rendering

**Remotion Lambda já instalado**

**Setup:**
- Deploy de workers no Lambda
- Queue management
- Status tracking
- Webhook notifications

#### 4.4 Acessibilidade

**Melhorias:**
- Keyboard shortcuts completos
- Screen reader support
- High contrast mode
- Closed captions editor

---

## 📚 Bibliotecas Avaliadas

### Editores Completos (Descartados)

#### ❌ Motionity
**Repo:** https://github.com/alyssaxuu/motionity

**Por que NÃO:**
- Editor completo standalone (88% JavaScript puro)
- Difícil integração com React/Next.js
- Código não modular
- Arquitetura monolítica
- Bundle muito pesado (~5MB+)

**O que USAR:**
- Conceitos de UI/UX
- Sistema de keyframes (inspiração)
- Easing curves

#### ⚠️ DesignCombo React Video Editor
**Repo:** https://github.com/designcombo/react-video-editor

**Status:** Referência de arquitetura

**Por que NÃO integrar diretamente:**
- Projeto muito novo (27 commits)
- Sem releases estáveis
- Arquitetura acoplada

**O que USAR:**
- Estrutura de componentes
- Timeline UI/UX
- Padrões de código React/TS

### Bibliotecas Core (Mantidas)

#### ✅ Remotion
**Status:** MANTER e EXPANDIR

**Versão:** 4.0.358

**Uso:**
- Renderização final
- Preview player
- Composições programáticas
- Lambda rendering

#### ✅ Fabric.js
**Status:** MANTER e EXPANDIR

**Versão:** 6.7.1

**Uso:**
- Canvas editor
- Manipulação de objetos
- Transformações
- Layers

#### ✅ GSAP
**Status:** MANTER

**Versão:** 3.13.0

**Uso:**
- Animações complexas
- Tweening
- Easing functions
- ScrollTrigger (futuro)

### Bibliotecas Novas (Recomendadas)

#### ✅ Theatre.js
**Licença:** Apache 2.0
**Bundle:** ~200KB
**GitHub:** https://github.com/theatre-js/theatre

**Justificativa:**
- Sistema de keyframes profissional
- Timeline visual integrado
- Export/import de estados
- Usado em produção (Netflix, etc)

#### ✅ Wavesurfer.js
**Licença:** BSD-3-Clause
**Bundle:** ~50KB
**GitHub:** https://github.com/katspaugh/wavesurfer.js

**Justificativa:**
- Melhor lib para waveforms
- Performance excelente
- API simples
- Plugins extensíveis

#### ✅ React Color
**Licença:** MIT
**Bundle:** ~80KB
**GitHub:** https://github.com/casesandberg/react-color

**Justificativa:**
- Color pickers profissionais
- Múltiplos estilos
- Suporte a RGB, HSL, HEX

---

## 🎯 Decisões Técnicas

### Por que NÃO usar Motionity completo?

1. **Arquitetura incompatível:** Motionity é standalone, não library
2. **Bundle size:** Adiciona 5MB+ ao bundle
3. **Manutenibilidade:** Código não modular
4. **Controle:** Perdemos controle do fluxo
5. **Integração:** Difícil integrar com Remotion

### Por que Theatre.js em vez de custom keyframes?

1. **Maturidade:** Usado em produção há anos
2. **Features:** Sistema completo de keyframes
3. **UI:** Editor visual integrado
4. **Performance:** Otimizado para 60fps
5. **Time-to-market:** 2 semanas vs. 2 meses custom

### Por que manter Fabric.js em vez de Canvas API puro?

1. **Produtividade:** API high-level
2. **Features:** Transformações, eventos, layers
3. **Ecosystem:** Plugins e comunidade
4. **JSON export:** Fácil persistência
5. **Performance:** Otimizações built-in

### Estratégia de Bundle Size

**Meta:** < 2MB total bundle (gzipped)

**Monitoramento:**
```bash
npm run build
npx @next/bundle-analyzer
```

**Técnicas:**
- Tree-shaking agressivo
- Dynamic imports
- Code splitting por rota
- Lazy loading de componentes pesados

---

## 📅 Cronograma e Estimativas

### Timeline Completa

```
Fase 1: Estabilização MVP
├── Semana 1-2: Implementação core
└── Entrega: MVP funcional

Fase 2: Editor Profissional
├── Semana 3: Canvas Editor
├── Semana 4: Timeline Multi-track
├── Semana 5: Keyframes (Theatre.js)
├── Semana 6: Preview + Remotion
└── Entrega: Editor v1.0

Fase 3: Recursos Avançados
├── Semana 7-8: Efeitos e transições
├── Semana 9: Mascaramento
├── Semana 10: Waveforms
├── Semana 11: Templates
├── Semana 12: Export avançado
└── Entrega: Editor v2.0

Fase 4: Otimização
├── Semana 13: Performance
├── Semana 14: Colaboração
├── Semana 15: Cloud rendering
└── Entrega: Editor v3.0 (Production-ready)
```

### Esforço por Fase

| Fase | Duração | Desenvolvedores | Esforço Total |
|------|---------|-----------------|---------------|
| Fase 1 | 2 semanas | 2 devs | 160h |
| Fase 2 | 4 semanas | 2 devs | 320h |
| Fase 3 | 6 semanas | 2-3 devs | 480h |
| Fase 4 | 3 semanas | 2 devs | 240h |
| **Total** | **15 semanas** | **2-3 devs** | **~1200h** |

### Custos Estimados

**Desenvolvimento:**
- Fase 1: R$ 32.000 (2 devs × 2 semanas × R$ 8.000/dev)
- Fase 2: R$ 64.000
- Fase 3: R$ 96.000
- Fase 4: R$ 48.000
- **Total Dev:** R$ 240.000

**Infraestrutura (mensal):**
- Supabase Pro: $25
- Upstash Redis: $40
- Remotion Lambda: ~$100 (variável)
- Sentry: $26
- **Total Infra:** ~$200/mês

---

## 🎯 Milestones e Entregas

### Milestone 1: MVP Funcional (Semana 2)
- ✅ Upload → Editor → Render → Download
- ✅ Autenticação funcional
- ✅ Dashboard básico

**Critério de aceite:** Usuário consegue criar vídeo de ponta a ponta

### Milestone 2: Editor v1.0 (Semana 6)
- ✅ Canvas editor visual
- ✅ Timeline multi-track
- ✅ Keyframes básicos
- ✅ Preview tempo real

**Critério de aceite:** Editor comparável ao iMovie/Filmora

### Milestone 3: Editor v2.0 (Semana 12)
- ✅ Efeitos e transições
- ✅ Templates profissionais
- ✅ Waveforms de áudio
- ✅ Export multi-formato

**Critério de aceite:** Editor comparável ao Adobe Premiere/Final Cut (básico)

### Milestone 4: Editor v3.0 (Semana 15)
- ✅ Performance otimizada
- ✅ Colaboração em tempo real
- ✅ Cloud rendering
- ✅ Acessibilidade completa

**Critério de aceite:** Production-ready para escala

---

## 📊 Métricas de Sucesso

### KPIs Técnicos

| Métrica | Meta |
|---------|------|
| Bundle Size | < 2MB gzipped |
| Canvas FPS | 60 FPS constante |
| Timeline Latency | < 100ms |
| Render Success Rate | > 95% |
| Time to Interactive | < 3s |
| Lighthouse Score | > 90 |

### KPIs de Produto

| Métrica | Meta |
|---------|------|
| Time to First Video | < 5 min |
| Daily Active Users | 1000+ (6 meses) |
| Avg. Session Duration | > 15 min |
| Video Completion Rate | > 80% |
| User Satisfaction (NPS) | > 50 |

---

## 🔒 Riscos e Mitigações

### Riscos Técnicos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Theatre.js complexo | Alto | Média | POC antes de commit |
| Bundle size explode | Alto | Média | Monitoring contínuo |
| Remotion render timeout | Médio | Alta | Limites de duração |
| Fabric.js performance | Médio | Baixa | Virtualização canvas |

### Riscos de Projeto

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Scope creep | Alto | Alta | Scope lock rigoroso |
| Falta de recursos | Alto | Média | Priorização clara |
| Mudança de requisitos | Médio | Alta | Fases incrementais |
| Tech debt acumula | Médio | Alta | Refactor contínuo |

---

## 🚀 Próximos Passos Imediatos

### Semana 1 (Fase 1)

1. **Segunda-feira:**
   - [ ] Review deste documento com time
   - [ ] Aprovação de scope lock
   - [ ] Setup ambiente dev

2. **Terça a Quinta:**
   - [ ] Implementar autenticação
   - [ ] Fluxo upload PPTX
   - [ ] Editor básico

3. **Sexta-feira:**
   - [ ] Demo interna
   - [ ] Retrospectiva
   - [ ] Planning Semana 2

---

## 📖 Referências

### Documentação
- [Remotion Docs](https://www.remotion.dev/docs/)
- [Fabric.js Docs](http://fabricjs.com/docs/)
- [Theatre.js Docs](https://www.theatrejs.com/docs/)
- [Wavesurfer.js Docs](https://wavesurfer-js.org/)

### Inspiração
- [DesignCombo React Video Editor](https://github.com/designcombo/react-video-editor)
- [Motionity](https://motionity.app/)
- [Remotion Showcase](https://www.remotion.dev/showcase)

### Artigos
- [Building a Video Editor in React](https://www.remotion.dev/blog/building-a-video-editor)
- [Theatre.js: Animation Tooling](https://blog.theatre.js.org/)

---

## ✅ Aprovações

| Papel | Nome | Assinatura | Data |
|-------|------|------------|------|
| Product Owner | Ana S. | _______________ | __/__/__ |
| Tech Lead | Bruno L. | _______________ | __/__/__ |
| Arquiteto | Laura F. | _______________ | __/__/__ |
| QA Lead | Carla M. | _______________ | __/__/__ |

---

**Documento gerado em:** 15 de Outubro de 2025
**Versão:** 1.0
**Status:** 📋 Aguardando Aprovação

---

_Este documento será atualizado conforme o projeto evolui. Mudanças significativas devem ser aprovadas via change request formal._
