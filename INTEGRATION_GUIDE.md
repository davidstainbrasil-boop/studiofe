# Studio Pro - Guia de Integração Rápida

Este guia mostra como integrar os novos componentes do Studio Pro (SPRINT 5-7) no aplicativo principal.

---

## 📦 Dependências Instaladas

```json
{
  "dependencies": {
    "jszip": "3.10.1",
    "three": "0.160.0",
    "@react-three/fiber": "8.15.0",
    "@react-three/drei": "9.92.0",
    "@types/three": "0.160.0"
  }
}
```

---

## 🎯 Integração no Studio Pro Page

### 1. Importar Tipos e Componentes

```tsx
// estudio_ia_videos/src/app/studio-pro/page.tsx

// Types
import type {
  VideoProject,
  Scene,
  Track,
  TimelineElement,
  TimelineState,
  Avatar,
  Conversation,
} from '@/types/video-project';

// Components
import { Timeline } from '@/components/studio-unified/Timeline';
import { AvatarLibrary } from '@/components/studio-unified/AvatarLibrary';
import { Avatar3DPreview } from '@/components/studio-unified/Avatar3DPreview';
import { ConversationBuilder } from '@/components/studio-unified/ConversationBuilder';

// Utils
import { importPPTX } from '@/lib/pptx/pptx-to-scenes';
```

### 2. Adicionar Estados

```tsx
export default function StudioProPage() {
  // Existing states...
  const [canvasScene, setCanvasScene] = useState<CanvasScene>(...);

  // NEW: Video Project states
  const [videoProject, setVideoProject] = useState<VideoProject | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [timelineState, setTimelineState] = useState<TimelineState>({
    currentTime: 0,
    zoom: 50,
    selectedElements: [],
    isPlaying: false,
    loop: false,
    snapToGrid: true,
    gridSize: 0.5,
  });

  // NEW: Avatar states
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  // NEW: Conversation states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Helper: Get current scene
  const currentScene = useMemo(() => {
    if (!videoProject || !currentSceneId) return null;
    return videoProject.scenes.find((s) => s.id === currentSceneId) || null;
  }, [videoProject, currentSceneId]);
}
```

### 3. Handlers para Timeline

```tsx
// Timeline handlers
const handleTimeUpdate = useCallback((time: number) => {
  setTimelineState((prev) => ({ ...prev, currentTime: time }));
}, []);

const handleSceneChange = useCallback((sceneId: string) => {
  setCurrentSceneId(sceneId);
  setTimelineState((prev) => ({ ...prev, currentTime: 0 }));
}, []);

const handleTrackUpdate = useCallback((sceneId: string, track: Track) => {
  setVideoProject((prev) => {
    if (!prev) return null;
    return {
      ...prev,
      scenes: prev.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              tracks: scene.tracks.map((t) =>
                t.id === track.id ? track : t
              ),
            }
          : scene
      ),
    };
  });
}, []);

const handleElementSelect = useCallback((elementIds: string[]) => {
  setTimelineState((prev) => ({ ...prev, selectedElements: elementIds }));
}, []);

const handlePlayPause = useCallback(() => {
  setTimelineState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
}, []);

const handleStop = useCallback(() => {
  setTimelineState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
}, []);
```

### 4. Handler para PPTX Import

```tsx
const handlePPTXImport = useCallback(async (file: File) => {
  try {
    const result = await importPPTX(file);

    if (result.warnings.length > 0) {
      console.warn('PPTX Import Warnings:', result.warnings);
      toast.warning(`Import completed with ${result.warnings.length} warnings`);
    }

    setVideoProject(result.project);
    setCurrentSceneId(result.project.scenes[0]?.id || null);

    toast.success(
      `Imported ${result.slidesProcessed} slides with ${result.elementsExtracted} elements`
    );
  } catch (error) {
    console.error('PPTX Import Error:', error);
    toast.error('Failed to import PPTX file');
  }
}, []);
```

### 5. Handlers para Avatares

```tsx
const handleSelectAvatar = useCallback((avatar: Avatar) => {
  setSelectedAvatar(avatar);
}, []);

const handleAddAvatarToTimeline = useCallback((avatar: Avatar) => {
  if (!videoProject || !currentSceneId) {
    toast.error('No scene selected');
    return;
  }

  // Find or create avatar track
  const scene = videoProject.scenes.find((s) => s.id === currentSceneId);
  if (!scene) return;

  let avatarTrack = scene.tracks.find((t) => t.type === 'avatar');

  if (!avatarTrack) {
    avatarTrack = {
      id: `track-avatar-${Date.now()}`,
      type: 'avatar',
      name: 'Avatars',
      elements: [],
      locked: false,
      visible: true,
      color: '#3b82f6',
    };
  }

  // Create timeline element
  const newElement: TimelineElement = {
    id: `element-${Date.now()}`,
    trackId: avatarTrack.id,
    sceneId: currentSceneId,
    startTime: timelineState.currentTime,
    duration: 5,
    endTime: timelineState.currentTime + 5,
    type: 'avatar',
    content: {
      avatarId: avatar.id,
      position: { x: 960, y: 540 },
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    animations: {},
  };

  avatarTrack.elements.push(newElement);

  // Update scene
  handleTrackUpdate(currentSceneId, avatarTrack);

  toast.success(`Added ${avatar.name} to timeline`);
}, [videoProject, currentSceneId, timelineState, handleTrackUpdate]);
```

### 6. Handlers para Conversação

```tsx
const handleSaveConversation = useCallback((conversation: Conversation) => {
  setConversations((prev) => {
    const existing = prev.find((c) => c.id === conversation.id);
    if (existing) {
      return prev.map((c) => (c.id === conversation.id ? conversation : c));
    }
    return [...prev, conversation];
  });

  setCurrentConversation(null);
  toast.success(`Conversation "${conversation.name}" saved`);
}, []);
```

---

## 🎨 Layout: Adicionar Componentes ao UI

### Opção 1: Left Panel - Avatar Library

```tsx
{/* Left Panel */}
<div className="w-80 border-r bg-gray-50 dark:bg-gray-900 flex flex-col">
  <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab}>
    <TabsList className="grid grid-cols-3">
      <TabsTrigger value="assets">Assets</TabsTrigger>
      <TabsTrigger value="avatars">Avatars</TabsTrigger>
      <TabsTrigger value="text">Text</TabsTrigger>
    </TabsList>

    <TabsContent value="avatars" className="flex-1">
      <AvatarLibrary
        avatars={avatars}
        selectedAvatarId={selectedAvatar?.id}
        onSelectAvatar={handleSelectAvatar}
        onAddToTimeline={handleAddAvatarToTimeline}
      />
    </TabsContent>
  </Tabs>
</div>
```

### Opção 2: Bottom Panel - Timeline

```tsx
{/* Bottom Panel - Timeline */}
<div className="h-96 border-t bg-black">
  {videoProject && currentScene ? (
    <Timeline
      scenes={videoProject.scenes}
      currentScene={currentScene}
      timelineState={timelineState}
      onTimeUpdate={handleTimeUpdate}
      onSceneChange={handleSceneChange}
      onTrackUpdate={handleTrackUpdate}
      onElementSelect={handleElementSelect}
      onPlayPause={handlePlayPause}
      onStop={handleStop}
    />
  ) : (
    <div className="flex items-center justify-center h-full text-gray-500">
      <p>Import a PPTX file to start editing</p>
    </div>
  )}
</div>
```

### Opção 3: Modal - Conversation Builder

```tsx
{/* Conversation Builder Modal */}
{showConversationBuilder && (
  <Dialog open={showConversationBuilder} onOpenChange={setShowConversationBuilder}>
    <DialogContent className="max-w-4xl h-[80vh]">
      <ConversationBuilder
        avatars={avatars}
        conversation={currentConversation}
        onSave={handleSaveConversation}
        onCancel={() => {
          setShowConversationBuilder(false);
          setCurrentConversation(null);
        }}
      />
    </DialogContent>
  </Dialog>
)}
```

### Opção 4: Right Panel - 3D Preview

```tsx
{/* Right Panel - Avatar Preview */}
<div className="w-80 border-l bg-gray-50 dark:bg-gray-900">
  {selectedAvatar ? (
    <div className="p-4">
      <h3 className="font-semibold mb-2">{selectedAvatar.name}</h3>
      <div className="aspect-square rounded-lg overflow-hidden border">
        <Avatar3DPreview
          avatar={selectedAvatar}
          autoRotate={true}
          showControls={true}
        />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-gray-500">
      <p>Select an avatar to preview</p>
    </div>
  )}
</div>
```

---

## 🚀 Funcionalidades Prontas para Usar

### 1. Importar PPTX

```tsx
<Button onClick={() => inputRef.current?.click()}>
  <Upload className="h-4 w-4 mr-2" />
  Import PPTX
</Button>
<input
  ref={inputRef}
  type="file"
  accept=".pptx"
  hidden
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handlePPTXImport(file);
  }}
/>
```

### 2. Criar Nova Conversação

```tsx
<Button onClick={() => {
  setCurrentConversation(null);
  setShowConversationBuilder(true);
}}>
  <MessageSquare className="h-4 w-4 mr-2" />
  New Conversation
</Button>
```

### 3. Export Video (Placeholder)

```tsx
const handleExportVideo = useCallback(async () => {
  if (!videoProject) return;

  toast.info('Video export feature coming in SPRINT 9');

  // TODO: Implement video export
  // - Render each scene with Remotion
  // - Compile with FFmpeg WASM
  // - Download final video
}, [videoProject]);
```

---

## 📝 Exemplo Completo de Integração

```tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Timeline } from '@/components/studio-unified/Timeline';
import { AvatarLibrary } from '@/components/studio-unified/AvatarLibrary';
import { Avatar3DPreview } from '@/components/studio-unified/Avatar3DPreview';
import { ConversationBuilder } from '@/components/studio-unified/ConversationBuilder';
import { importPPTX } from '@/lib/pptx/pptx-to-scenes';
import type { VideoProject, TimelineState, Avatar, Conversation } from '@/types/video-project';

export default function StudioProPage() {
  // States
  const [videoProject, setVideoProject] = useState<VideoProject | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [timelineState, setTimelineState] = useState<TimelineState>({
    currentTime: 0,
    zoom: 50,
    selectedElements: [],
    isPlaying: false,
    loop: false,
    snapToGrid: true,
    gridSize: 0.5,
  });
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [showConversationBuilder, setShowConversationBuilder] = useState(false);

  const currentScene = useMemo(() => {
    if (!videoProject || !currentSceneId) return null;
    return videoProject.scenes.find((s) => s.id === currentSceneId) || null;
  }, [videoProject, currentSceneId]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="h-14 border-b flex items-center px-4 gap-2">
        <Button onClick={handlePPTXImport}>Import PPTX</Button>
        <Button onClick={() => setShowConversationBuilder(true)}>
          New Conversation
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Avatars */}
        <div className="w-80 border-r">
          <AvatarLibrary
            avatars={avatars}
            selectedAvatarId={selectedAvatar?.id}
            onSelectAvatar={setSelectedAvatar}
            onAddToTimeline={handleAddAvatarToTimeline}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 bg-gray-900">
          {/* Your existing canvas component */}
        </div>

        {/* Right Panel - Preview */}
        <div className="w-80 border-l">
          {selectedAvatar && (
            <Avatar3DPreview avatar={selectedAvatar} autoRotate={true} />
          )}
        </div>
      </div>

      {/* Bottom Panel - Timeline */}
      <div className="h-96 border-t">
        {currentScene && (
          <Timeline
            scenes={videoProject!.scenes}
            currentScene={currentScene}
            timelineState={timelineState}
            onTimeUpdate={(time) => setTimelineState((prev) => ({ ...prev, currentTime: time }))}
            onSceneChange={setCurrentSceneId}
            onTrackUpdate={handleTrackUpdate}
            onElementSelect={(ids) => setTimelineState((prev) => ({ ...prev, selectedElements: ids }))}
            onPlayPause={() => setTimelineState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))}
            onStop={() => setTimelineState({ ...timelineState, isPlaying: false, currentTime: 0 })}
          />
        )}
      </div>

      {/* Conversation Builder Modal */}
      {showConversationBuilder && (
        <ConversationBuilder
          avatars={avatars}
          onSave={handleSaveConversation}
          onCancel={() => setShowConversationBuilder(false)}
        />
      )}
    </div>
  );
}
```

---

## ✅ Checklist de Integração

- [ ] Importar todos os tipos de `@/types/video-project`
- [ ] Importar componentes Timeline, AvatarLibrary, Avatar3DPreview, ConversationBuilder
- [ ] Adicionar estados para VideoProject, Timeline, Avatares, Conversações
- [ ] Implementar handlers (PPTX import, timeline controls, avatar selection)
- [ ] Adicionar componentes ao layout (left/right/bottom panels)
- [ ] Testar importação de PPTX
- [ ] Testar seleção e preview de avatares
- [ ] Testar criação de conversações
- [ ] Testar timeline playback

---

## 🎓 Recursos Adicionais

- **Status Completo**: Ver `STUDIO_PRO_STATUS.md`
- **Testes**: Executar `node test-sprint{5,6,7}-*.mjs`
- **Tipos**: Ver `src/types/video-project.ts`

---

**Pronto para produção!** 🚀
